import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  PasswordHasher,
  Permission,
  type StaffPrincipal,
} from '../src/auth/auth.module';
import { configureApplication } from '../src/app.setup';
import {
  CatalogStatus,
  Prisma,
  StaffRoleCode,
} from '../src/generated/prisma/client';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { InventoryService } from '../src/inventory/inventory.module';
import {
  MockPaymentProvider,
  MockPaymentScenario,
} from '../src/payments/payments.module';

type CheckoutResponse = {
  id: string;
  orderNumber: string;
  checkoutUrl: string;
};

describe('Phase 7 security and production-readiness integration', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let inventory: InventoryService;
  let hasher: PasswordHasher;
  let mockProvider: MockPaymentProvider;
  const suffix = randomUUID().slice(0, 8);
  const actor: StaffPrincipal = {
    id: randomUUID(),
    email: 'phase7.invalid@example.invalid',
    displayName: 'Phase 7 fixture',
    role: 'ADMIN',
    permissions: Object.values(Permission),
    sessionId: randomUUID(),
  };

  beforeAll(async () => {
    const databaseName = new URL(process.env.DATABASE_URL!).pathname.slice(1);
    if (!/(?:_ci|_test)$/.test(databaseName)) {
      throw new Error(
        `Integration tests require an isolated *_ci or *_test database, received ${databaseName}`,
      );
    }
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    configureApplication(app);
    await app.init();
    prisma = app.get(PrismaService);
    inventory = app.get(InventoryService);
    hasher = app.get(PasswordHasher);
    mockProvider = app.get(MockPaymentProvider);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('rejects a webhook with an invalid signature without mutating payment state', async () => {
    const fixture = await createSellableFixture(1);
    const checkout = await createOnlineCheckout(
      fixture.variantId,
      fixture.deliveryZoneId,
    );
    const attemptToken = checkoutAttemptToken(checkout.checkoutUrl);
    const signed = await mockProvider.createSignedScenario(
      attemptToken,
      MockPaymentScenario.SUCCESS,
    );

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/mock')
      .set('Content-Type', 'application/json')
      .set('X-Mock-Signature', `${signed.signature}-tampered`)
      .send(signed.rawBody)
      .expect(400);

    const order = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: checkout.orderNumber },
    });
    expect(order.status).toBe('PENDING_PAYMENT');
    expect(order.paymentStatus).toBe('PENDING');
    expect(
      await prisma.paymentEvent.count({
        where: {
          payment: {
            orderId: checkout.id,
          },
        },
      }),
    ).toBe(0);
  });

  it('rejects customer session cookies on staff-only endpoints', async () => {
    const agent = request.agent(app.getHttpServer());
    const email = `customer-${suffix}-${randomUUID().slice(0, 4)}@example.invalid`;
    const password = 'customer-password-123';

    await agent
      .post('/api/v1/customer/auth/register')
      .send({
        email,
        firstName: 'Phase',
        lastName: 'Seven',
        password,
        passwordConfirm: password,
      })
      .expect(201);
    await agent
      .post('/api/v1/customer/auth/login')
      .send({ email, password })
      .expect(201);

    await agent.get('/api/v1/staff/auth/me').expect(401);
    await agent.get('/api/v1/staff/users').expect(401);
  });

  it('temporarily blocks repeated failed staff logins from the same identity and IP', async () => {
    const email = `staff-${suffix}-${randomUUID().slice(0, 4)}@example.invalid`;
    const password = 'phase7-staff-password';
    const role = await prisma.role.upsert({
      where: { code: StaffRoleCode.ADMIN },
      create: { code: StaffRoleCode.ADMIN, name: 'Administrator' },
      update: {},
    });
    await prisma.staffUser.create({
      data: {
        email,
        displayName: 'Throttle fixture',
        passwordHash: await hasher.hash(password),
        roleId: role.id,
      },
    });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await request(app.getHttpServer())
        .post('/api/v1/staff/auth/login')
        .send({ email, password: 'wrong-password-123' })
        .expect(401);
    }

    await request(app.getHttpServer())
      .post('/api/v1/staff/auth/login')
      .send({ email, password: 'wrong-password-123' })
      .expect(403)
      .expect((response: { body: unknown }) => {
        expect(response.body).toMatchObject({
          code: 'HTTP_403',
          message: 'Login temporarily blocked',
        });
      });
  });

  async function createOnlineCheckout(
    variantId: string,
    deliveryZoneId: string,
  ): Promise<CheckoutResponse> {
    const cart = await request(app.getHttpServer())
      .post('/api/v1/storefront/cart')
      .send({})
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/storefront/cart/${(cart.body as { id: string }).id}/items`)
      .send({ variantId, quantity: 1 })
      .expect(201);
    const checkout = await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/online')
      .set('Idempotency-Key', `phase7-online-${randomUUID()}`)
      .send({
        cartId: (cart.body as { id: string }).id,
        fulfillmentType: 'DELIVERY',
        deliveryZoneId,
        recipientName: 'Phase 7 Customer',
        phone: '+994501234567',
        email: 'phase7-customer@example.invalid',
        administrativeArea: 'baku',
        addressLine: 'Phase 7 delivery address',
        paymentMethod: 'CARD',
      })
      .expect(201);
    return checkout.body as CheckoutResponse;
  }

  function checkoutAttemptToken(checkoutUrl: string) {
    const token = new URL(checkoutUrl).searchParams.get('attemptToken');
    if (token === null) {
      throw new Error('attemptToken is missing from checkoutUrl');
    }
    return token;
  }

  async function createSellableFixture(onHand: number) {
    const category = await prisma.category.create({
      data: {
        name: `Phase 7 ${suffix}-${randomUUID().slice(0, 4)}`,
        slug: `phase-7-${suffix}-${randomUUID().slice(0, 4)}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: `Phase 7 product ${suffix}`,
        slug: `phase-7-product-${suffix}-${randomUUID().slice(0, 4)}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `P7-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Phase 7 variant',
        attributes: {},
        price: new Prisma.Decimal('199.00'),
        status: CatalogStatus.ACTIVE,
      },
    });
    const location = await prisma.location.create({
      data: {
        code: `P7-WH-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Phase 7 warehouse',
        type: 'WAREHOUSE',
      },
    });
    const deliveryZone = await prisma.deliveryZone.create({
      data: {
        code: `P7-ZONE-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Baku phase 7 zone',
        fee: new Prisma.Decimal('5.00'),
        freeDeliveryMinimum: new Prisma.Decimal('400.00'),
        estimatedMinDays: 1,
        estimatedMaxDays: 2,
        coveredAdministrativeAreas: ['baku'],
      },
    });
    await inventory.receipt(
      {
        variantId: variant.id,
        locationId: location.id,
        quantity: onHand,
        sourceType: 'phase7-fixture',
        sourceDocumentId: `receipt-${suffix}-${randomUUID().slice(0, 4)}`,
        reason: 'Phase 7 checkout fixture',
      },
      actor,
    );
    return {
      variantId: variant.id,
      locationId: location.id,
      deliveryZoneId: deliveryZone.id,
    };
  }
});
