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
  PaymentStatus,
  Prisma,
  StaffRoleCode,
} from '../src/generated/prisma/client';
import { InventoryService } from '../src/inventory/inventory.module';
import {
  MockPaymentProvider,
  MockPaymentScenario,
} from '../src/payments/payments.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

type AuthenticatedAgent = ReturnType<typeof request.agent>;
type CheckoutResponse = {
  id: string;
  orderNumber: string;
  checkoutUrl: string;
};

describe('Customer order cancellation integration', () => {
  const ORDER_CANCEL_REASON_MIN_LENGTH = 3;
  const ORDER_CANCEL_REASON_MAX_LENGTH = 240;
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let inventory: InventoryService;
  let hasher: PasswordHasher;
  let mockProvider: MockPaymentProvider;
  const suffix = randomUUID().slice(0, 8);
  const actor: StaffPrincipal = {
    id: randomUUID(),
    email: 'customer-orders.invalid@example.invalid',
    displayName: 'Customer orders fixture',
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

  it('rejects customer order cancellation without authentication', async () => {
    const { orderId } = await createOwnedCustomerOrder('CONFIRMED');

    await request(app.getHttpServer())
      .post(`/api/v1/customer/orders/${orderId}/cancel`)
      .send({ reason: 'Sifarişi artıq istəmirəm' })
      .expect(401);
  });

  it('returns not found when cancelling another customer order', async () => {
    const owner = await registerCustomer();
    const intruder = await registerCustomer();
    const { orderId } = await createOwnedCustomerOrder('CONFIRMED', owner);

    await intruder.agent
      .post(`/api/v1/customer/orders/${orderId}/cancel`)
      .send({ reason: 'Sifarişi artıq istəmirəm' })
      .expect(404);
  });

  it('rejects cancellation when reason is missing, too short, or too long', async () => {
    const customer = await registerCustomer();
    const { orderId } = await createOwnedCustomerOrder('CONFIRMED', customer);

    await customer.agent
      .post(`/api/v1/customer/orders/${orderId}/cancel`)
      .send({})
      .expect(400);

    await customer.agent
      .post(`/api/v1/customer/orders/${orderId}/cancel`)
      .send({ reason: '  ' })
      .expect(400);

    await customer.agent
      .post(`/api/v1/customer/orders/${orderId}/cancel`)
      .send({ reason: 'ab'.slice(0, ORDER_CANCEL_REASON_MIN_LENGTH - 1) })
      .expect(400);

    await customer.agent
      .post(`/api/v1/customer/orders/${orderId}/cancel`)
      .send({
        reason: 'x'.repeat(ORDER_CANCEL_REASON_MAX_LENGTH + 1),
      })
      .expect(400);
  });

  it('cancels a customer order in PENDING_PAYMENT status', async () => {
    const customer = await registerCustomer();
    const { orderId } = await createOwnedCustomerOrder(
      'PENDING_PAYMENT',
      customer,
    );

    await cancelOwnedOrder(customer, orderId, 'Online ödənişdən imtina etdim');
  });

  it('cancels a customer order in UNDER_REVIEW status', async () => {
    const customer = await registerCustomer();
    const { orderId } = await createOwnedCustomerOrder(
      'UNDER_REVIEW',
      customer,
    );

    await cancelOwnedOrder(customer, orderId, 'Kredit müraciətindən imtina');
  });

  it('cancels a customer order in CONFIRMED status', async () => {
    const customer = await registerCustomer();
    const { orderId } = await createOwnedCustomerOrder('CONFIRMED', customer);

    await cancelOwnedOrder(customer, orderId, 'Sifarişi artıq istəmirəm');
  });

  it('cancels a paid online order and triggers automatic full refund', async () => {
    const customer = await registerCustomer();
    const fixture = await createPickupFixture(4);
    const checkout = await createOnlinePickupCheckout(
      fixture.variantId,
      fixture.pickupLocationId,
      customer.email,
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

    const paidOrder = await prisma.order.findUniqueOrThrow({
      where: { id: checkout.id },
    });
    expect(paidOrder.status).toBe('CONFIRMED');
    expect(paidOrder.paymentStatus).toBe(PaymentStatus.PAID);
    expect(paidOrder.customerId).toBe(customer.customerId);

    await customer.agent
      .post(`/api/v1/customer/orders/${checkout.id}/cancel`)
      .send({ reason: 'Online ödənişdən sonra imtina etdim' })
      .expect(200)
      .expect(
        ({
          body,
        }: {
          body: { status: string; cancelledByCustomer?: boolean };
        }) => {
          expect(body.status).toBe('CANCELLED');
          expect(body.cancelledByCustomer).toBe(true);
        },
      );

    const cancelled = await prisma.order.findUniqueOrThrow({
      where: { id: checkout.id },
    });
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.paymentStatus).toBe(PaymentStatus.REFUNDED);
    expect(cancelled.fulfillmentStatus).toBe('CANCELLED');

    const payment = await prisma.payment.findUniqueOrThrow({
      where: { orderId: checkout.id },
    });
    expect(payment.status).toBe(PaymentStatus.REFUNDED);

    const refunds = await prisma.refund.findMany({
      where: { paymentId: payment.id },
    });
    expect(refunds).toHaveLength(1);
    expect(refunds[0]?.status).toBe('SUCCEEDED');
  });

  it('rejects cancellation for orders in PROCESSING and COMPLETED status', async () => {
    const customer = await registerCustomer();
    const processingOrder = await createOwnedCustomerOrder(
      'PROCESSING',
      customer,
    );
    const completedOrder = await createOwnedCustomerOrder(
      'COMPLETED',
      customer,
    );

    await customer.agent
      .post(`/api/v1/customer/orders/${processingOrder.orderId}/cancel`)
      .send({ reason: 'Anbar artıq sifarişi hazırlayır' })
      .expect(409);

    await customer.agent
      .post(`/api/v1/customer/orders/${completedOrder.orderId}/cancel`)
      .send({ reason: 'Sifariş artıq tamamlanıb' })
      .expect(409);
  });

  async function cancelOwnedOrder(
    customer: RegisteredCustomer,
    orderId: string,
    reason: string,
  ) {
    await customer.agent
      .post(`/api/v1/customer/orders/${orderId}/cancel`)
      .send({ reason })
      .expect(200)
      .expect(
        ({
          body,
        }: {
          body: { status: string; cancelledByCustomer?: boolean };
        }) => {
          expect(body.status).toBe('CANCELLED');
          expect(body.cancelledByCustomer).toBe(true);
        },
      );

    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    expect(history).toHaveLength(1);
    expect(history[0]?.actorType).toBe('CUSTOMER');
    expect(history[0]?.reason).toBe(reason);
  }

  type RegisteredCustomer = {
    agent: AuthenticatedAgent;
    email: string;
    password: string;
    customerId: string;
  };

  async function registerCustomer(): Promise<RegisteredCustomer> {
    const email = `customer-${suffix}-${randomUUID().slice(0, 6)}@example.invalid`;
    const password = `customer-password-${randomUUID().slice(0, 8)}`;
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/api/v1/customer/auth/register')
      .send({
        email,
        firstName: 'Cancel',
        lastName: 'Customer',
        password,
        passwordConfirm: password,
      })
      .expect(201);

    await agent
      .post('/api/v1/customer/auth/login')
      .send({ email, password })
      .expect(201);

    const customer = await prisma.customer.findUniqueOrThrow({
      where: { email },
      select: { id: true },
    });

    return { agent, email, password, customerId: customer.id };
  }

  async function createOwnedCustomerOrder(
    targetStatus:
      | 'PENDING_PAYMENT'
      | 'UNDER_REVIEW'
      | 'CONFIRMED'
      | 'PROCESSING'
      | 'COMPLETED',
    customer?: RegisteredCustomer,
  ): Promise<{ orderId: string }> {
    const resolvedCustomer = customer ?? (await registerCustomer());

    const fixture = await createPickupFixture(4);
    let orderId: string;

    if (targetStatus === 'PENDING_PAYMENT') {
      orderId = (
        await createOnlinePickupCheckout(
          fixture.variantId,
          fixture.pickupLocationId,
          resolvedCustomer.email,
        )
      ).id;
    } else {
      orderId = await createPickupCashOrder(
        fixture.variantId,
        fixture.pickupLocationId,
        resolvedCustomer.email,
        targetStatus === 'UNDER_REVIEW' ? 'INSTALLMENT' : 'CASH',
      );
    }

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expect(order.customerId).toBe(resolvedCustomer.customerId);

    if (targetStatus === 'PROCESSING' || targetStatus === 'COMPLETED') {
      const manager = await loginAs(StaffRoleCode.MANAGER, [
        Permission.ORDERS_READ,
        Permission.FULFILLMENT_WRITE,
      ]);

      await manager
        .post(`/api/v1/orders/${orderId}/transitions`)
        .send({
          action: 'START_PROCESSING',
          reason: 'Warehouse started packing the pickup order',
        })
        .expect(201);

      if (targetStatus === 'COMPLETED') {
        await manager
          .post(`/api/v1/orders/${orderId}/transitions`)
          .send({
            action: 'MARK_READY_FOR_PICKUP',
            reason: 'Order is waiting at the pickup desk',
          })
          .expect(201);

        await manager
          .post(`/api/v1/orders/${orderId}/transitions`)
          .send({
            action: 'COMPLETE',
            reason: 'Customer collected the order and paid cash',
          })
          .expect(201);
      }
    }

    const refreshed = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expect(refreshed.status).toBe(targetStatus);

    return { orderId };
  }

  async function createPickupCashOrder(
    variantId: string,
    pickupLocationId: string,
    email: string,
    paymentMethod: 'CASH' | 'INSTALLMENT',
  ): Promise<string> {
    const cart = await request(app.getHttpServer())
      .post('/api/v1/storefront/cart')
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/storefront/cart/${(cart.body as { id: string }).id}/items`)
      .send({ variantId, quantity: 1 })
      .expect(201);

    const order = await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/cash')
      .set('Idempotency-Key', `customer-cancel-cash-${randomUUID()}`)
      .send({
        cartId: (cart.body as { id: string }).id,
        fulfillmentType: 'PICKUP',
        pickupLocationId,
        recipientName: 'Cancel fixture customer',
        phone: '+994501234567',
        email,
        addressLine: 'Pickup counter',
        ...(paymentMethod === 'INSTALLMENT'
          ? { paymentMethod: 'INSTALLMENT', installmentMonths: 6 }
          : {}),
      })
      .expect(201);

    return (order.body as { id: string }).id;
  }

  async function createOnlinePickupCheckout(
    variantId: string,
    pickupLocationId: string,
    email: string,
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
      .set('Idempotency-Key', `customer-cancel-online-${randomUUID()}`)
      .send({
        cartId: (cart.body as { id: string }).id,
        fulfillmentType: 'PICKUP',
        pickupLocationId,
        recipientName: 'Cancel fixture customer',
        phone: '+994501234567',
        email,
        addressLine: 'Pickup counter',
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

  async function loginAs(
    roleCode: StaffRoleCode,
    permissions: string[],
  ): Promise<AuthenticatedAgent> {
    const role = await prisma.role.upsert({
      where: { code: roleCode },
      create: { code: roleCode, name: roleCode },
      update: { name: roleCode },
    });
    for (const code of permissions) {
      await prisma.permission.upsert({
        where: { code },
        create: { code, description: code },
        update: { description: code },
      });
    }
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const permissionRows = await prisma.permission.findMany({
      where: { code: { in: permissions } },
      select: { id: true },
    });
    await prisma.rolePermission.createMany({
      data: permissionRows.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
      })),
      skipDuplicates: true,
    });

    const email = `${roleCode.toLowerCase()}-${randomUUID().slice(0, 8)}@example.invalid`;
    const password = `customer-orders-${roleCode.toLowerCase()}-password`;
    await prisma.staffUser.create({
      data: {
        email,
        displayName: `${roleCode} customer orders fixture`,
        passwordHash: await hasher.hash(password),
        roleId: role.id,
      },
    });

    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/v1/staff/auth/login')
      .send({ email, password })
      .expect(201);
    return agent;
  }

  async function createPickupFixture(onHand: number) {
    const category = await prisma.category.create({
      data: {
        name: `Customer cancel ${suffix}-${randomUUID().slice(0, 4)}`,
        slug: `customer-cancel-${suffix}-${randomUUID().slice(0, 4)}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: `Customer cancel product ${suffix}`,
        slug: `customer-cancel-product-${suffix}-${randomUUID().slice(0, 4)}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `CC-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Customer cancel variant',
        attributes: {},
        price: new Prisma.Decimal('149.00'),
        status: CatalogStatus.ACTIVE,
      },
    });
    const location = await prisma.location.create({
      data: {
        code: `CC-LOC-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Customer cancel pickup location',
        type: 'PICKUP',
      },
    });
    const pickupLocation = await prisma.pickupLocation.create({
      data: {
        locationId: location.id,
        code: `CC-PICKUP-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Customer cancel pickup desk',
        addressLine: 'Pickup desk',
        workingHours: {},
      },
    });
    await inventory.receipt(
      {
        variantId: variant.id,
        locationId: location.id,
        quantity: onHand,
        sourceType: 'customer-cancel-fixture',
        sourceDocumentId: `receipt-${suffix}-${randomUUID().slice(0, 4)}`,
        reason: 'Customer cancel fixture',
      },
      actor,
    );
    return {
      variantId: variant.id,
      locationId: location.id,
      pickupLocationId: pickupLocation.id,
    };
  }
});
