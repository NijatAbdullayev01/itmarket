import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { createHmac, randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/app.setup';
import { Permission, type StaffPrincipal } from '../src/auth/auth.module';
import { CatalogStatus, Prisma } from '../src/generated/prisma/client';
import { InventoryService } from '../src/inventory/inventory.module';
import {
  MockPaymentProvider,
  MockPaymentScenario,
  PaymentsService,
} from '../src/payments/payments.module';
import {
  OrdersService,
  OrderTransitionAction,
} from '../src/orders/orders.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

type CheckoutResponse = {
  id: string;
  orderNumber: string;
  checkoutUrl: string;
};

describe('Phase 4 PostgreSQL integration', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let inventory: InventoryService;
  let payments: PaymentsService;
  let mockProvider: MockPaymentProvider;
  let orders: OrdersService;
  const suffix = randomUUID().slice(0, 8);
  const actor: StaffPrincipal = {
    id: randomUUID(),
    email: 'phase4.invalid@example.invalid',
    displayName: 'Phase 4 fixture',
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
    payments = app.get(PaymentsService);
    mockProvider = app.get(MockPaymentProvider);
    orders = app.get(OrdersService);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('confirms an online order after a signed paid callback', async () => {
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
      .set('X-Mock-Signature', signed.signature)
      .send(signed.rawBody)
      .expect(201);

    const order = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: checkout.orderNumber },
    });
    expect(order.status).toBe('CONFIRMED');
    expect(order.paymentStatus).toBe('PAID');
    expect(order.fulfillmentStatus).toBe('RESERVED');

    const balance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: {
        variantId_locationId: {
          variantId: fixture.variantId,
          locationId: fixture.locationId,
        },
      },
    });
    expect(balance.onHand).toBe(1);
    expect(balance.reserved).toBe(1);
  });

  it('releases reserved stock when payment fails', async () => {
    const fixture = await createSellableFixture(1);
    const checkout = await createOnlineCheckout(
      fixture.variantId,
      fixture.deliveryZoneId,
    );
    const attemptToken = checkoutAttemptToken(checkout.checkoutUrl);
    const signed = await mockProvider.createSignedScenario(
      attemptToken,
      MockPaymentScenario.FAILURE,
    );

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/mock')
      .set('Content-Type', 'application/json')
      .set('X-Mock-Signature', signed.signature)
      .send(signed.rawBody)
      .expect(201);

    const order = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: checkout.orderNumber },
    });
    expect(order.status).toBe('CANCELLED');
    expect(order.paymentStatus).toBe('FAILED');
    expect(order.fulfillmentStatus).toBe('CANCELLED');
    expect(
      await prisma.stockReservation.count({
        where: {
          orderId: checkout.id,
          status: 'RELEASED',
        },
      }),
    ).toBe(1);

    const balance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: {
        variantId_locationId: {
          variantId: fixture.variantId,
          locationId: fixture.locationId,
        },
      },
    });
    expect(balance.reserved).toBe(0);
  });

  it('expires a pending payment and cancels the order after reservation timeout', async () => {
    const fixture = await createSellableFixture(1);
    const checkout = await createOnlineCheckout(
      fixture.variantId,
      fixture.deliveryZoneId,
    );

    await prisma.stockReservation.updateMany({
      where: { orderId: checkout.id, status: 'ACTIVE' },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    await payments.expirePendingPayments(new Date());

    const order = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: checkout.orderNumber },
    });
    expect(order.status).toBe('CANCELLED');
    expect(order.paymentStatus).toBe('CANCELLED');
    expect(
      await prisma.stockReservation.count({
        where: {
          orderId: checkout.id,
          status: 'EXPIRED',
        },
      }),
    ).toBe(1);

    const balance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: {
        variantId_locationId: {
          variantId: fixture.variantId,
          locationId: fixture.locationId,
        },
      },
    });
    expect(balance.reserved).toBe(0);
  });

  it('ignores a duplicate callback after the first transition', async () => {
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
      .set('X-Mock-Signature', signed.signature)
      .send(signed.rawBody)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/mock')
      .set('Content-Type', 'application/json')
      .set('X-Mock-Signature', signed.signature)
      .send(signed.rawBody)
      .expect(201);

    expect(
      await prisma.paymentEvent.count({
        where: {
          payment: {
            orderId: checkout.id,
          },
        },
      }),
    ).toBe(1);
  });

  it('records a mismatch callback without marking the order as paid', async () => {
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
    const payload = JSON.parse(signed.rawBody) as {
      eventId: string;
      eventType: string;
      providerPaymentId: string;
      orderNumber: string;
      paymentStatus: string;
      amount: string;
      currency: string;
      occurredAt: string;
    };
    payload.amount = '999.99';
    const tamperedBody = JSON.stringify(payload);
    const tamperedSignature = createHmac(
      'sha256',
      process.env.APP_SECRET ?? 'test-app-secret',
    )
      .update(tamperedBody)
      .digest('hex');

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/mock')
      .set('Content-Type', 'application/json')
      .set('X-Mock-Signature', tamperedSignature)
      .send(tamperedBody)
      .expect(201);

    const order = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: checkout.orderNumber },
    });
    expect(order.status).toBe('PENDING_PAYMENT');
    expect(order.paymentStatus).toBe('PENDING');
    expect(order.fulfillmentStatus).toBe('PENDING');

    const outboxEntry = await prisma.notificationOutbox.findFirst({
      where: {
        topic: 'payments.mismatch.detected',
        referenceId: (
          await prisma.payment.findUniqueOrThrow({
            where: { orderId: checkout.id },
            select: { id: true },
          })
        ).id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(outboxEntry).not.toBeNull();
  });

  it('reconciles a staged remote payment result without a webhook callback', async () => {
    const fixture = await createSellableFixture(1);
    const checkout = await createOnlineCheckout(
      fixture.variantId,
      fixture.deliveryZoneId,
    );
    const attemptToken = checkoutAttemptToken(checkout.checkoutUrl);

    await mockProvider.stageScenario(attemptToken, MockPaymentScenario.SUCCESS);
    expect(await payments.reconcilePendingPayments(new Date())).toBeGreaterThan(
      0,
    );

    const order = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: checkout.orderNumber },
    });
    expect(order.status).toBe('CONFIRMED');
    expect(order.paymentStatus).toBe('PAID');
    expect(order.fulfillmentStatus).toBe('RESERVED');
  });

  it('refunds a paid order when staff cancels the fulfillment', async () => {
    const fixture = await createSellableFixture(1);
    const checkout = await createOnlineCheckout(
      fixture.variantId,
      fixture.deliveryZoneId,
    );
    const signed = await mockProvider.createSignedScenario(
      checkoutAttemptToken(checkout.checkoutUrl),
      MockPaymentScenario.SUCCESS,
    );

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/mock')
      .set('Content-Type', 'application/json')
      .set('X-Mock-Signature', signed.signature)
      .send(signed.rawBody)
      .expect(201);

    await orders.transition(
      checkout.id,
      {
        action: OrderTransitionAction.CANCEL,
        reason: 'customer requested cancellation before shipment',
      },
      actor,
    );

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: checkout.id },
    });
    expect(order.status).toBe('CANCELLED');
    expect(order.paymentStatus).toBe('REFUNDED');
    expect(order.fulfillmentStatus).toBe('CANCELLED');

    const payment = await prisma.payment.findUniqueOrThrow({
      where: { orderId: checkout.id },
    });
    expect(payment.status).toBe('REFUNDED');

    const refunds = await prisma.refund.findMany({
      where: { paymentId: payment.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(refunds).toHaveLength(1);
    expect(refunds[0]?.amount.toFixed(2)).toBe('245.00');
    expect(refunds[0]?.status).toBe('SUCCEEDED');

    const balance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: {
        variantId_locationId: {
          variantId: fixture.variantId,
          locationId: fixture.locationId,
        },
      },
    });
    expect(balance.onHand).toBe(1);
    expect(balance.reserved).toBe(0);
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
      .set('Idempotency-Key', `online-${randomUUID()}`)
      .send({
        cartId: (cart.body as { id: string }).id,
        fulfillmentType: 'DELIVERY',
        deliveryZoneId,
        recipientName: 'Integration Customer',
        phone: '+994501234567',
        email: 'phase4-customer@example.invalid',
        administrativeArea: 'baku',
        addressLine: 'Test delivery address',
        paymentMethod: 'CARD',
      })
      .expect(201);
    return checkout.body as CheckoutResponse;
  }

  function checkoutAttemptToken(checkoutUrl: string) {
    const token = new URL(checkoutUrl).searchParams.get('attemptToken');
    if (token === null)
      throw new Error('attemptToken is missing from checkoutUrl');
    return token;
  }

  async function createSellableFixture(onHand: number) {
    const category = await prisma.category.create({
      data: {
        name: `Phase 4 ${suffix}-${randomUUID().slice(0, 4)}`,
        slug: `phase-4-${suffix}-${randomUUID().slice(0, 4)}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: `Phase 4 product ${suffix}`,
        slug: `phase-4-product-${suffix}-${randomUUID().slice(0, 4)}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `P4-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Phase 4 variant',
        attributes: {},
        price: new Prisma.Decimal('240.00'),
        status: CatalogStatus.ACTIVE,
      },
    });
    const location = await prisma.location.create({
      data: {
        code: `P4-WH-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Phase 4 warehouse',
        type: 'WAREHOUSE',
      },
    });
    const deliveryZone = await prisma.deliveryZone.create({
      data: {
        code: `P4-ZONE-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Baku test zone',
        fee: new Prisma.Decimal('5.00'),
        freeDeliveryMinimum: new Prisma.Decimal('500.00'),
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
        sourceType: 'phase4-fixture',
        sourceDocumentId: `receipt-${suffix}-${randomUUID().slice(0, 4)}`,
        reason: 'Phase 4 checkout fixture',
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
