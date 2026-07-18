import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { createHash, createHmac, randomUUID } from 'node:crypto';
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

type SignedPaymentPayload = {
  eventId: string;
  eventType: string;
  providerPaymentId: string;
  orderNumber: string;
  paymentStatus: string;
  amount: string;
  currency: string;
  occurredAt: string;
};

type EpointWebhookPayload = {
  status: string;
  order_id: string;
  transaction: string;
  amount: string;
  currency: string;
  card_id?: string;
  card_mask?: string;
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
    process.env.EPOINT_PUBLIC_KEY ??= 'i000000001';
    process.env.EPOINT_PRIVATE_KEY ??= 'epoint-private-key';
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
    expect(
      await prisma.fulfillmentEvent.findFirst({
        where: {
          orderId: checkout.id,
          eventType: 'mock.payment.paid',
          fulfillmentStatus: 'RESERVED',
        },
      }),
    ).not.toBeNull();
  });

  it('accepts a signed Epoint callback for an existing pending checkout', async () => {
    const fixture = await createSellableFixture(1);
    const checkout = await createOnlineCheckout(
      fixture.variantId,
      fixture.deliveryZoneId,
    );
    const providerPaymentId = `te${Date.now()}${randomUUID().slice(0, 6)}`;
    const payment = await prisma.payment.update({
      where: { orderId: checkout.id },
      data: {
        provider: 'epoint',
        providerPaymentId,
      },
      select: {
        id: true,
        amount: true,
        currency: true,
      },
    });
    await prisma.paymentAttempt.updateMany({
      where: { paymentId: payment.id },
      data: { providerPaymentId },
    });
    const signed = createSignedEpointEvent({
      status: 'success',
      order_id: checkout.orderNumber,
      transaction: providerPaymentId,
      amount: payment.amount.toFixed(2),
      currency: payment.currency,
      card_id: 'card_123',
      card_mask: '123456******1234',
    });

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/epoint')
      .set('Content-Type', 'application/json')
      .send(signed)
      .expect(201)
      .expect(
        ({
          body,
        }: {
          body: {
            orderStatus: string;
            paymentStatus: string;
            fulfillmentStatus: string;
            provider: string;
          };
        }) => {
          expect(body.orderStatus).toBe('CONFIRMED');
          expect(body.paymentStatus).toBe('PAID');
          expect(body.fulfillmentStatus).toBe('RESERVED');
          expect(body.provider).toBe('epoint');
        },
      );

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: checkout.id },
    });
    expect(order.status).toBe('CONFIRMED');
    expect(order.paymentStatus).toBe('PAID');
    expect(order.fulfillmentStatus).toBe('RESERVED');
    expect(
      await prisma.paymentEvent.findFirst({
        where: {
          paymentId: payment.id,
          eventType: 'epoint.payment.success',
          providerPaymentId,
        },
      }),
    ).not.toBeNull();
    expect(
      await prisma.fulfillmentEvent.findFirst({
        where: {
          orderId: checkout.id,
          eventType: 'epoint.payment.success',
          fulfillmentStatus: 'RESERVED',
        },
      }),
    ).not.toBeNull();
  });

  it('preserves an explicit guest token when creating a new cart', async () => {
    const guestToken = `phase4-guest-${randomUUID()}-${randomUUID()}`;
    const cart = await request(app.getHttpServer())
      .post('/api/v1/storefront/cart')
      .send({ guestToken })
      .expect(201);

    expect((cart.body as { guestToken: string }).guestToken).toBe(guestToken);

    const loadedCart = await request(app.getHttpServer())
      .get(`/api/v1/storefront/cart/${(cart.body as { id: string }).id}`)
      .expect(200);
    expect((loadedCart.body as { guestToken: string }).guestToken).toBe(
      guestToken,
    );
  });

  it('reuses the same online checkout for an idempotent retry and rejects a different key for the same cart', async () => {
    const fixture = await createSellableFixture(1);
    const cart = await createCartWithItem(fixture.variantId);
    const idempotencyKey = `phase4-online-${randomUUID()}`;

    const first = await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/online')
      .set('Idempotency-Key', idempotencyKey)
      .send({
        cartId: cart.id,
        fulfillmentType: 'DELIVERY',
        deliveryZoneId: fixture.deliveryZoneId,
        recipientName: 'Integration Customer',
        phone: '+994501234567',
        email: 'phase4-customer@example.invalid',
        administrativeArea: 'baku',
        addressLine: 'Test delivery address',
        paymentMethod: 'CARD',
      })
      .expect(201);

    const retry = await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/online')
      .set('Idempotency-Key', idempotencyKey)
      .send({
        cartId: cart.id,
        fulfillmentType: 'DELIVERY',
        deliveryZoneId: fixture.deliveryZoneId,
        recipientName: 'Integration Customer',
        phone: '+994501234567',
        email: 'phase4-customer@example.invalid',
        administrativeArea: 'baku',
        addressLine: 'Test delivery address',
        paymentMethod: 'CARD',
      })
      .expect(201);

    expect((retry.body as CheckoutResponse).id).toBe(
      (first.body as CheckoutResponse).id,
    );
    expect((retry.body as CheckoutResponse).checkoutUrl).toBe(
      (first.body as CheckoutResponse).checkoutUrl,
    );

    await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/online')
      .set('Idempotency-Key', `phase4-online-${randomUUID()}`)
      .send({
        cartId: cart.id,
        fulfillmentType: 'DELIVERY',
        deliveryZoneId: fixture.deliveryZoneId,
        recipientName: 'Integration Customer',
        phone: '+994501234567',
        email: 'phase4-customer@example.invalid',
        administrativeArea: 'baku',
        addressLine: 'Test delivery address',
        paymentMethod: 'CARD',
      })
      .expect(409);
  });

  it('allows different carts to use the same online idempotency key', async () => {
    const fixture = await createSellableFixture(2);
    const sharedIdempotencyKey = `phase4-online-shared-${randomUUID()}`;
    const firstCart = await createCartWithItem(fixture.variantId);
    const secondCart = await createCartWithItem(fixture.variantId);

    const first = await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/online')
      .set('Idempotency-Key', sharedIdempotencyKey)
      .send({
        cartId: firstCart.id,
        fulfillmentType: 'DELIVERY',
        deliveryZoneId: fixture.deliveryZoneId,
        recipientName: 'Integration Customer',
        phone: '+994501234567',
        email: 'phase4-customer@example.invalid',
        administrativeArea: 'baku',
        addressLine: 'Test delivery address',
        paymentMethod: 'CARD',
      })
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/online')
      .set('Idempotency-Key', sharedIdempotencyKey)
      .send({
        cartId: secondCart.id,
        fulfillmentType: 'DELIVERY',
        deliveryZoneId: fixture.deliveryZoneId,
        recipientName: 'Integration Customer',
        phone: '+994501234567',
        email: 'phase4-customer@example.invalid',
        administrativeArea: 'baku',
        addressLine: 'Test delivery address',
        paymentMethod: 'CARD',
      })
      .expect(201);

    expect((first.body as CheckoutResponse).id).not.toBe(
      (second.body as CheckoutResponse).id,
    );
  });

  it('reuses the same cash checkout for an idempotent retry and rejects a different key for the same cart', async () => {
    const fixture = await createSellableFixture(1);
    const cart = await createCartWithItem(fixture.variantId);
    const idempotencyKey = `phase4-cash-${randomUUID()}`;

    const first = await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/cash')
      .set('Idempotency-Key', idempotencyKey)
      .send({
        cartId: cart.id,
        fulfillmentType: 'PICKUP',
        pickupLocationId: fixture.pickupLocationId,
        recipientName: 'Pickup customer',
        phone: '+994509998877',
        email: 'pickup@example.invalid',
        addressLine: 'Pickup counter',
      })
      .expect(201);

    const retry = await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/cash')
      .set('Idempotency-Key', idempotencyKey)
      .send({
        cartId: cart.id,
        fulfillmentType: 'PICKUP',
        pickupLocationId: fixture.pickupLocationId,
        recipientName: 'Pickup customer',
        phone: '+994509998877',
        email: 'pickup@example.invalid',
        addressLine: 'Pickup counter',
      })
      .expect(201);

    expect((retry.body as { id: string }).id).toBe(
      (first.body as { id: string }).id,
    );

    await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/cash')
      .set('Idempotency-Key', `phase4-cash-${randomUUID()}`)
      .send({
        cartId: cart.id,
        fulfillmentType: 'PICKUP',
        pickupLocationId: fixture.pickupLocationId,
        recipientName: 'Pickup customer',
        phone: '+994509998877',
        email: 'pickup@example.invalid',
        addressLine: 'Pickup counter',
      })
      .expect(409);
  });

  it('allows different carts to use the same cash idempotency key', async () => {
    const fixture = await createSellableFixture(2);
    const sharedIdempotencyKey = `phase4-cash-shared-${randomUUID()}`;
    const firstCart = await createCartWithItem(fixture.variantId);
    const secondCart = await createCartWithItem(fixture.variantId);

    const first = await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/cash')
      .set('Idempotency-Key', sharedIdempotencyKey)
      .send({
        cartId: firstCart.id,
        fulfillmentType: 'PICKUP',
        pickupLocationId: fixture.pickupLocationId,
        recipientName: 'Pickup customer',
        phone: '+994509998877',
        email: 'pickup@example.invalid',
        addressLine: 'Pickup counter',
      })
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/cash')
      .set('Idempotency-Key', sharedIdempotencyKey)
      .send({
        cartId: secondCart.id,
        fulfillmentType: 'PICKUP',
        pickupLocationId: fixture.pickupLocationId,
        recipientName: 'Pickup customer',
        phone: '+994509998877',
        email: 'pickup@example.invalid',
        addressLine: 'Pickup counter',
      })
      .expect(201);

    expect((first.body as { id: string }).id).not.toBe(
      (second.body as { id: string }).id,
    );
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

  it('flags a late paid callback for manual review after the order has timed out', async () => {
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

    await prisma.stockReservation.updateMany({
      where: { orderId: checkout.id, status: 'ACTIVE' },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    await payments.expirePendingPayments(new Date());

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/mock')
      .set('Content-Type', 'application/json')
      .set('X-Mock-Signature', signed.signature)
      .send(signed.rawBody)
      .expect(201);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: checkout.id },
    });
    expect(order.status).toBe('CANCELLED');
    expect(order.paymentStatus).toBe('CANCELLED');
    expect(order.fulfillmentStatus).toBe('CANCELLED');

    const manualReview = await prisma.notificationOutbox.findFirst({
      where: {
        topic: 'payments.manual-review.required',
        referenceId: checkout.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(manualReview).not.toBeNull();
    expect(
      (
        manualReview?.payload as {
          reason?: string;
        } | null
      )?.reason,
    ).toBe('late_paid_after_cancellation');
  });

  it('cancels an online order when the provider sends a cancellation callback', async () => {
    const fixture = await createSellableFixture(1);
    const checkout = await createOnlineCheckout(
      fixture.variantId,
      fixture.deliveryZoneId,
    );
    const attemptToken = checkoutAttemptToken(checkout.checkoutUrl);
    const signed = await mockProvider.createSignedScenario(
      attemptToken,
      MockPaymentScenario.CANCEL,
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
    expect(order.paymentStatus).toBe('CANCELLED');
    expect(order.fulfillmentStatus).toBe('CANCELLED');
    expect(
      await prisma.stockReservation.count({
        where: {
          orderId: checkout.id,
          status: 'RELEASED',
        },
      }),
    ).toBe(1);
  });

  it('cancels an authorized online order when a later cancellation callback arrives', async () => {
    const fixture = await createSellableFixture(1);
    const checkout = await createOnlineCheckout(
      fixture.variantId,
      fixture.deliveryZoneId,
    );
    const attemptToken = checkoutAttemptToken(checkout.checkoutUrl);
    const authorized = await createSignedEvent(attemptToken, {
      eventType: 'mock.payment.authorized',
      paymentStatus: 'AUTHORIZED',
    });
    const cancelled = await createSignedEvent(attemptToken, {
      eventType: 'mock.payment.cancelled',
      paymentStatus: 'CANCELLED',
    });

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/mock')
      .set('Content-Type', 'application/json')
      .set('X-Mock-Signature', authorized.signature)
      .send(authorized.rawBody)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/mock')
      .set('Content-Type', 'application/json')
      .set('X-Mock-Signature', cancelled.signature)
      .send(cancelled.rawBody)
      .expect(201);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: checkout.id },
    });
    expect(order.status).toBe('CANCELLED');
    expect(order.paymentStatus).toBe('CANCELLED');
    expect(order.fulfillmentStatus).toBe('CANCELLED');

    const payment = await prisma.payment.findUniqueOrThrow({
      where: { orderId: checkout.id },
    });
    expect(payment.status).toBe('CANCELLED');

    expect(
      await prisma.paymentAttempt.count({
        where: {
          paymentId: payment.id,
          status: 'CANCELLED',
        },
      }),
    ).toBe(1);
    expect(
      await prisma.stockReservation.count({
        where: {
          orderId: checkout.id,
          status: 'RELEASED',
        },
      }),
    ).toBe(1);
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
    const payment = await prisma.payment.findUniqueOrThrow({
      where: { orderId: checkout.id },
    });
    expect(payment.status).toBe('CANCELLED');
    expect(
      await prisma.paymentEvent.findFirst({
        where: {
          paymentId: payment.id,
          eventType: 'mock.payment.cancelled',
          status: 'CANCELLED',
        },
      }),
    ).not.toBeNull();
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

  it('stores an out-of-order failure callback without reverting a paid order', async () => {
    const fixture = await createSellableFixture(1);
    const checkout = await createOnlineCheckout(
      fixture.variantId,
      fixture.deliveryZoneId,
    );
    const attemptToken = checkoutAttemptToken(checkout.checkoutUrl);
    const paid = await mockProvider.createSignedScenario(
      attemptToken,
      MockPaymentScenario.SUCCESS,
    );
    const lateFailure = await createSignedEvent(attemptToken, {
      eventType: 'mock.payment.failed',
      paymentStatus: 'FAILED',
    });

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/mock')
      .set('Content-Type', 'application/json')
      .set('X-Mock-Signature', paid.signature)
      .send(paid.rawBody)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/mock')
      .set('Content-Type', 'application/json')
      .set('X-Mock-Signature', lateFailure.signature)
      .send(lateFailure.rawBody)
      .expect(201);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: checkout.id },
    });
    expect(order.status).toBe('CONFIRMED');
    expect(order.paymentStatus).toBe('PAID');
    expect(order.fulfillmentStatus).toBe('RESERVED');
    expect(
      await prisma.paymentEvent.count({
        where: {
          payment: {
            orderId: checkout.id,
          },
        },
      }),
    ).toBe(2);
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

  it('keeps an authorized payment pending until a later capture callback arrives', async () => {
    const fixture = await createSellableFixture(1);
    const checkout = await createOnlineCheckout(
      fixture.variantId,
      fixture.deliveryZoneId,
    );
    const attemptToken = checkoutAttemptToken(checkout.checkoutUrl);
    const authorized = await createSignedEvent(attemptToken, {
      eventType: 'mock.payment.authorized',
      paymentStatus: 'AUTHORIZED',
    });
    const paid = await createSignedEvent(attemptToken, {
      eventType: 'mock.payment.paid',
      paymentStatus: 'PAID',
    });

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/mock')
      .set('Content-Type', 'application/json')
      .set('X-Mock-Signature', authorized.signature)
      .send(authorized.rawBody)
      .expect(201);

    let order = await prisma.order.findUniqueOrThrow({
      where: { id: checkout.id },
    });
    expect(order.status).toBe('PENDING_PAYMENT');
    expect(order.paymentStatus).toBe('AUTHORIZED');
    expect(order.fulfillmentStatus).toBe('PENDING');
    expect(
      (
        await prisma.fulfillmentEvent.findMany({
          where: { orderId: checkout.id },
          orderBy: { createdAt: 'asc' },
        })
      ).map((event) => event.eventType),
    ).toEqual(['orders.online.created', 'mock.payment.authorized']);

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/mock')
      .set('Content-Type', 'application/json')
      .set('X-Mock-Signature', paid.signature)
      .send(paid.rawBody)
      .expect(201);

    order = await prisma.order.findUniqueOrThrow({
      where: { id: checkout.id },
    });
    expect(order.status).toBe('CONFIRMED');
    expect(order.paymentStatus).toBe('PAID');
    expect(order.fulfillmentStatus).toBe('RESERVED');
    expect(
      (
        await prisma.fulfillmentEvent.findMany({
          where: { orderId: checkout.id },
          orderBy: { createdAt: 'asc' },
        })
      ).map((event) => event.eventType),
    ).toEqual([
      'orders.online.created',
      'mock.payment.authorized',
      'mock.payment.paid',
    ]);
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

    const latestFulfillmentEvent =
      await prisma.fulfillmentEvent.findFirstOrThrow({
        where: {
          orderId: checkout.id,
          eventType: 'orders.cancelled',
        },
        orderBy: { createdAt: 'desc' },
      });
    expect(latestFulfillmentEvent.actorStaffId).toBe(actor.id);
    expect(latestFulfillmentEvent.fulfillmentStatus).toBe('CANCELLED');
    expect(latestFulfillmentEvent.payload).toEqual(
      expect.objectContaining({
        orderNumber: checkout.orderNumber,
        refundAmount: '245.00',
      }),
    );

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

  it('supports partial refund retries without duplicating provider-side effects', async () => {
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

    const payment = await prisma.payment.findUniqueOrThrow({
      where: { orderId: checkout.id },
    });

    const partialRefund = await prisma.$transaction((tx) =>
      payments.refundPayment(tx, {
        paymentId: payment.id,
        reason: 'partial compensation approved',
        idempotencyKey: `phase4-partial-${checkout.id}`,
        amount: new Prisma.Decimal('100.00'),
      }),
    );
    expect(partialRefund.paymentStatus).toBe('PARTIALLY_REFUNDED');
    let order = await prisma.order.findUniqueOrThrow({
      where: { id: checkout.id },
    });
    expect(order.paymentStatus).toBe('PARTIALLY_REFUNDED');
    expect(
      await prisma.fulfillmentEvent.findFirst({
        where: {
          orderId: checkout.id,
          eventType: 'mock.payment.refunded',
          paymentStatus: 'PARTIALLY_REFUNDED',
        },
      }),
    ).not.toBeNull();

    const duplicateRefund = await prisma.$transaction((tx) =>
      payments.refundPayment(tx, {
        paymentId: payment.id,
        reason: 'partial compensation approved',
        idempotencyKey: `phase4-partial-${checkout.id}`,
        amount: new Prisma.Decimal('100.00'),
      }),
    );
    expect(duplicateRefund.refundId).toBe(partialRefund.refundId);
    expect(
      await prisma.refund.count({
        where: { paymentId: payment.id },
      }),
    ).toBe(1);

    const finalRefund = await prisma.$transaction((tx) =>
      payments.refundPayment(tx, {
        paymentId: payment.id,
        reason: 'remaining balance refunded',
        idempotencyKey: `phase4-final-${checkout.id}`,
      }),
    );
    expect(finalRefund.paymentStatus).toBe('REFUNDED');
    order = await prisma.order.findUniqueOrThrow({
      where: { id: checkout.id },
    });
    expect(order.paymentStatus).toBe('REFUNDED');

    const updatedPayment = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(updatedPayment.status).toBe('REFUNDED');
    expect(
      await prisma.refund.count({
        where: { paymentId: payment.id },
      }),
    ).toBe(2);
  });

  it('returns REFUNDED on duplicate full-refund retries without creating extra rows', async () => {
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

    const payment = await prisma.payment.findUniqueOrThrow({
      where: { orderId: checkout.id },
    });

    const firstRefund = await prisma.$transaction((tx) =>
      payments.refundPayment(tx, {
        paymentId: payment.id,
        reason: 'full refund retry coverage',
        idempotencyKey: `phase4-full-${checkout.id}`,
      }),
    );
    expect(firstRefund.paymentStatus).toBe('REFUNDED');
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: checkout.id },
    });
    expect(order.paymentStatus).toBe('REFUNDED');

    const duplicateRefund = await prisma.$transaction((tx) =>
      payments.refundPayment(tx, {
        paymentId: payment.id,
        reason: 'full refund retry coverage',
        idempotencyKey: `phase4-full-${checkout.id}`,
      }),
    );
    expect(duplicateRefund.refundId).toBe(firstRefund.refundId);
    expect(duplicateRefund.paymentStatus).toBe('REFUNDED');
    expect(
      await prisma.refund.count({
        where: { paymentId: payment.id },
      }),
    ).toBe(1);
  });

  it('completes a paid online delivery order and consumes the reservation exactly once', async () => {
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
        action: OrderTransitionAction.START_PROCESSING,
        reason: 'warehouse started preparing delivery',
      },
      actor,
    );
    await orders.transition(
      checkout.id,
      {
        action: OrderTransitionAction.MARK_OUT_FOR_DELIVERY,
        reason: 'courier picked up the parcel',
      },
      actor,
    );
    await orders.transition(
      checkout.id,
      {
        action: OrderTransitionAction.COMPLETE,
        reason: 'delivery completed successfully',
      },
      actor,
    );

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: checkout.id },
    });
    expect(order.status).toBe('COMPLETED');
    expect(order.paymentStatus).toBe('PAID');
    expect(order.fulfillmentStatus).toBe('FULFILLED');

    const balance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: {
        variantId_locationId: {
          variantId: fixture.variantId,
          locationId: fixture.locationId,
        },
      },
    });
    expect(balance.onHand).toBe(0);
    expect(balance.reserved).toBe(0);
    expect(
      await prisma.stockReservation.count({
        where: {
          orderId: checkout.id,
          status: 'CONSUMED',
        },
      }),
    ).toBe(1);
  });

  it('completes a paid online pickup order and records fulfillment events in order', async () => {
    const fixture = await createSellableFixture(1);
    const checkout = await createOnlineCheckout(
      fixture.variantId,
      fixture.deliveryZoneId,
      {
        fulfillmentType: 'PICKUP',
        pickupLocationId: fixture.pickupLocationId,
      },
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
        action: OrderTransitionAction.START_PROCESSING,
        reason: 'pickup order is being prepared',
      },
      actor,
    );
    await orders.transition(
      checkout.id,
      {
        action: OrderTransitionAction.MARK_READY_FOR_PICKUP,
        reason: 'pickup desk has received the package',
      },
      actor,
    );
    await orders.transition(
      checkout.id,
      {
        action: OrderTransitionAction.COMPLETE,
        reason: 'customer collected the pickup order',
      },
      actor,
    );

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: checkout.id },
    });
    expect(order.status).toBe('COMPLETED');
    expect(order.paymentStatus).toBe('PAID');
    expect(order.fulfillmentStatus).toBe('FULFILLED');

    const events = await prisma.fulfillmentEvent.findMany({
      where: { orderId: checkout.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(events.map((event) => event.eventType)).toEqual([
      'orders.online.created',
      'mock.payment.paid',
      'orders.processing.started',
      'orders.pickup.ready',
      'orders.completed',
    ]);
    expect(events.map((event) => event.fulfillmentStatus)).toEqual([
      'PENDING',
      'RESERVED',
      'RESERVED',
      'READY_FOR_PICKUP',
      'FULFILLED',
    ]);
  });

  it('persists installment selections when checkout eligibility allows them', async () => {
    const fixture = await createSellableFixture(1);
    const checkout = await createOnlineCheckout(
      fixture.variantId,
      fixture.deliveryZoneId,
      {
        paymentMethod: 'INSTALLMENT',
        installmentMonths: 3,
        installmentProvider: 'birbank',
      },
    );

    const payment = await prisma.payment.findUniqueOrThrow({
      where: { orderId: checkout.id },
    });
    const attempt = await prisma.paymentAttempt.findFirstOrThrow({
      where: { paymentId: payment.id },
      orderBy: { createdAt: 'desc' },
    });

    expect(payment.method).toBe('INSTALLMENT');
    expect(attempt.method).toBe('INSTALLMENT');
    expect(attempt.installmentMonths).toBe(3);
    expect(checkout.checkoutUrl).toContain('installmentMonths=3');
    expect(checkout.checkoutUrl).toContain('installmentProvider=birbank');
  });

  async function createOnlineCheckout(
    variantId: string,
    deliveryZoneId: string,
    options: {
      paymentMethod?: 'CARD' | 'INSTALLMENT';
      installmentMonths?: number;
      installmentProvider?: 'birbank' | 'tamkart' | 'leobank';
      fulfillmentType?: 'DELIVERY' | 'PICKUP';
      pickupLocationId?: string;
      cartId?: string;
      idempotencyKey?: string;
    } = {},
  ): Promise<CheckoutResponse> {
    const cart =
      options.cartId === undefined
        ? await createCartWithItem(variantId)
        : { id: options.cartId };
    const checkout = await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/online')
      .set(
        'Idempotency-Key',
        options.idempotencyKey ?? `online-${randomUUID()}`,
      )
      .send(
        options.fulfillmentType === 'PICKUP'
          ? {
              cartId: cart.id,
              fulfillmentType: 'PICKUP',
              pickupLocationId: options.pickupLocationId,
              recipientName: 'Integration Customer',
              phone: '+994501234567',
              email: 'phase4-customer@example.invalid',
              paymentMethod: options.paymentMethod ?? 'CARD',
              ...(options.installmentMonths === undefined
                ? {}
                : { installmentMonths: options.installmentMonths }),
              ...(options.installmentProvider === undefined
                ? {}
                : { installmentProvider: options.installmentProvider }),
            }
          : {
              cartId: cart.id,
              fulfillmentType: 'DELIVERY',
              deliveryZoneId,
              recipientName: 'Integration Customer',
              phone: '+994501234567',
              email: 'phase4-customer@example.invalid',
              administrativeArea: 'baku',
              addressLine: 'Test delivery address',
              paymentMethod: options.paymentMethod ?? 'CARD',
              ...(options.installmentMonths === undefined
                ? {}
                : { installmentMonths: options.installmentMonths }),
              ...(options.installmentProvider === undefined
                ? {}
                : { installmentProvider: options.installmentProvider }),
            },
      )
      .expect(201);
    return checkout.body as CheckoutResponse;
  }

  async function createCartWithItem(variantId: string) {
    const cart = await request(app.getHttpServer())
      .post('/api/v1/storefront/cart')
      .send({})
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/storefront/cart/${(cart.body as { id: string }).id}/items`)
      .send({ variantId, quantity: 1 })
      .expect(201);
    return { id: (cart.body as { id: string }).id };
  }

  function checkoutAttemptToken(checkoutUrl: string) {
    const token = new URL(checkoutUrl).searchParams.get('attemptToken');
    if (token === null)
      throw new Error('attemptToken is missing from checkoutUrl');
    return token;
  }

  async function createSignedEvent(
    attemptToken: string,
    overrides: Partial<SignedPaymentPayload>,
  ) {
    const signed = await mockProvider.createSignedScenario(
      attemptToken,
      MockPaymentScenario.SUCCESS,
    );
    const payload = {
      ...(JSON.parse(signed.rawBody) as SignedPaymentPayload),
      ...overrides,
      eventId: overrides.eventId ?? `mock_evt_${randomUUID()}`,
    };
    const rawBody = JSON.stringify(payload);
    return {
      rawBody,
      signature: signRawBody(rawBody),
    };
  }

  function signRawBody(rawBody: string) {
    return createHmac('sha256', process.env.APP_SECRET ?? 'test-app-secret')
      .update(rawBody)
      .digest('hex');
  }

  function createSignedEpointEvent(payload: EpointWebhookPayload) {
    const data = Buffer.from(JSON.stringify(payload)).toString('base64');
    const privateKey = process.env.EPOINT_PRIVATE_KEY ?? 'epoint-private-key';
    const signature = createHash('sha1')
      .update(`${privateKey}${data}${privateKey}`)
      .digest('base64');
    return { data, signature };
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
    const pickupLocation = await prisma.pickupLocation.create({
      data: {
        locationId: location.id,
        code: `P4-PICKUP-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Phase 4 pickup point',
        addressLine: 'Pickup test address',
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
      pickupLocationId: pickupLocation.id,
    };
  }
});
