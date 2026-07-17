import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/app.setup';
import { CatalogStatus, Prisma } from '../src/generated/prisma/client';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { InventoryService } from '../src/inventory/inventory.module';
import { PaymentsService } from '../src/payments/payments.module';
import { Permission, type StaffPrincipal } from '../src/auth/auth.module';

type CartResponse = { id: string };
type OrderResponse = { id: string };

describe('Phase 3 PostgreSQL integration', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let inventory: InventoryService;
  let payments: PaymentsService;
  const suffix = randomUUID().slice(0, 8);
  const actor: StaffPrincipal = {
    id: randomUUID(),
    email: 'phase3.invalid@example.invalid',
    displayName: 'Phase 3 fixture',
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
    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
    prisma = app.get(PrismaService);
    inventory = app.get(InventoryService);
    payments = app.get(PaymentsService);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('creates a cash delivery order and reserves stock exactly once', async () => {
    const fixture = await createSellableFixture(1);
    const cart = await request(app.getHttpServer())
      .post('/api/v1/storefront/cart')
      .send({})
      .expect(201);
    const cartBody = cart.body as CartResponse;
    await request(app.getHttpServer())
      .post(`/api/v1/storefront/cart/${cartBody.id}/items`)
      .send({ variantId: fixture.variantId, quantity: 1 })
      .expect(201);

    const checkout = await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/cash')
      .set('Idempotency-Key', `cash-${suffix}`)
      .send({
        cartId: cartBody.id,
        fulfillmentType: 'DELIVERY',
        deliveryZoneId: fixture.deliveryZoneId,
        recipientName: 'Integration Customer',
        phone: '+994501234567',
        email: 'customer@example.invalid',
        administrativeArea: 'baku',
        addressLine: 'Test delivery address',
      })
      .expect(201);
    const checkoutBody = checkout.body as OrderResponse;

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
      await prisma.stockReservation.count({
        where: { orderId: checkoutBody.id, status: 'ACTIVE' },
      }),
    ).toBe(1);

    const retry = await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/cash')
      .set('Idempotency-Key', `cash-${suffix}`)
      .send({
        cartId: cartBody.id,
        fulfillmentType: 'DELIVERY',
        deliveryZoneId: fixture.deliveryZoneId,
        recipientName: 'Integration Customer',
        phone: '+994501234567',
        email: 'customer@example.invalid',
        administrativeArea: 'baku',
        addressLine: 'Test delivery address',
      })
      .expect(201);
    const retryBody = retry.body as OrderResponse;
    expect(retryBody.id).toBe(checkoutBody.id);
    expect(
      await prisma.stockReservation.count({
        where: { orderId: checkoutBody.id, status: 'ACTIVE' },
      }),
    ).toBe(1);
  });

  it('rejects oversell when another cash checkout already reserved stock', async () => {
    const fixture = await createSellableFixture(1);
    const firstCart = await createCartWithItem(fixture.variantId);
    const secondCart = await createCartWithItem(fixture.variantId);

    await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/cash')
      .set('Idempotency-Key', `first-${suffix}`)
      .send(cashCheckoutPayload(firstCart, fixture.deliveryZoneId))
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/cash')
      .set('Idempotency-Key', `second-${suffix}`)
      .send(cashCheckoutPayload(secondCart, fixture.deliveryZoneId))
      .expect(409);
  });

  it('expires a stale cash reservation and releases stock once', async () => {
    const fixture = await createSellableFixture(1);
    const cartId = await createCartWithItem(fixture.variantId);

    const checkout = await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/cash')
      .set('Idempotency-Key', `cash-expire-${suffix}`)
      .send(cashCheckoutPayload(cartId, fixture.deliveryZoneId))
      .expect(201);
    const checkoutBody = checkout.body as OrderResponse;

    await prisma.stockReservation.updateMany({
      where: { orderId: checkoutBody.id, status: 'ACTIVE' },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    await payments.expirePendingPayments(new Date());

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: checkoutBody.id },
    });
    expect(order.status).toBe('CANCELLED');
    expect(order.paymentStatus).toBe('CANCELLED');
    expect(order.fulfillmentStatus).toBe('CANCELLED');
    expect(
      await prisma.stockReservation.count({
        where: { orderId: checkoutBody.id, status: 'EXPIRED' },
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

  it('creates a pickup cash order and reserves stock at the pickup location', async () => {
    const fixture = await createPickupFixture(2);
    const cartId = await createCartWithItem(fixture.variantId);

    const checkout = await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/cash')
      .set('Idempotency-Key', `pickup-${suffix}`)
      .send({
        cartId,
        fulfillmentType: 'PICKUP',
        pickupLocationId: fixture.pickupLocationId,
        recipientName: 'Pickup Customer',
        phone: '+994501998877',
        email: 'pickup@example.invalid',
        addressLine: 'Pickup desk confirmation',
      })
      .expect(201);
    const checkoutBody = checkout.body as OrderResponse;

    const balance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: {
        variantId_locationId: {
          variantId: fixture.variantId,
          locationId: fixture.locationId,
        },
      },
    });
    expect(balance.onHand).toBe(2);
    expect(balance.reserved).toBe(1);
    expect(
      await prisma.stockReservation.count({
        where: { orderId: checkoutBody.id, locationId: fixture.locationId },
      }),
    ).toBe(1);
  });

  it('rejects a delivery checkout when the selected zone does not cover the administrative area', async () => {
    const fixture = await createSellableFixture(1);
    const cartId = await createCartWithItem(fixture.variantId);

    await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/cash')
      .set('Idempotency-Key', `zone-mismatch-${suffix}`)
      .send({
        cartId,
        fulfillmentType: 'DELIVERY',
        deliveryZoneId: fixture.deliveryZoneId,
        recipientName: 'Mismatch Customer',
        phone: '+994501110000',
        email: 'mismatch@example.invalid',
        administrativeArea: 'sumqayit',
        addressLine: 'Coverage mismatch address',
      })
      .expect(400);
  });

  it('requires administrative area for delivery checkout', async () => {
    const fixture = await createSellableFixture(1);
    const cartId = await createCartWithItem(fixture.variantId);

    await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/cash')
      .set('Idempotency-Key', `zone-required-${suffix}`)
      .send({
        cartId,
        fulfillmentType: 'DELIVERY',
        deliveryZoneId: fixture.deliveryZoneId,
        recipientName: 'Missing Area Customer',
        phone: '+994501220000',
        email: 'missing-area@example.invalid',
        addressLine: 'Administrative area missing',
      })
      .expect(400);
  });

  it('rotates to a fresh active cart when a guest token belongs to a checked out cart', async () => {
    const fixture = await createSellableFixture(1);
    const firstCart = await request(app.getHttpServer())
      .post('/api/v1/storefront/cart')
      .send({})
      .expect(201);
    const firstCartBody = firstCart.body as CartResponse & {
      guestToken: string;
    };
    await request(app.getHttpServer())
      .post(`/api/v1/storefront/cart/${firstCartBody.id}/items`)
      .send({ variantId: fixture.variantId, quantity: 1 })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/cash')
      .set('Idempotency-Key', `rotate-${suffix}`)
      .send(cashCheckoutPayload(firstCartBody.id, fixture.deliveryZoneId))
      .expect(201);

    const replacement = await request(app.getHttpServer())
      .post('/api/v1/storefront/cart')
      .send({ guestToken: firstCartBody.guestToken })
      .expect(201);
    const replacementBody = replacement.body as CartResponse & {
      guestToken: string;
      status: string;
    };

    expect(replacementBody.id).not.toBe(firstCartBody.id);
    expect(replacementBody.status).toBe('ACTIVE');
    expect(replacementBody.guestToken).not.toBe(firstCartBody.guestToken);
  });

  async function createCartWithItem(variantId: string): Promise<string> {
    const cart = await request(app.getHttpServer())
      .post('/api/v1/storefront/cart')
      .send({})
      .expect(201);
    const cartBody = cart.body as CartResponse;
    await request(app.getHttpServer())
      .post(`/api/v1/storefront/cart/${cartBody.id}/items`)
      .send({ variantId, quantity: 1 })
      .expect(201);
    return cartBody.id;
  }

  function cashCheckoutPayload(cartId: string, deliveryZoneId: string) {
    return {
      cartId,
      fulfillmentType: 'DELIVERY',
      deliveryZoneId,
      recipientName: 'Integration Customer',
      phone: '+994501234567',
      email: 'customer@example.invalid',
      administrativeArea: 'baku',
      addressLine: 'Test delivery address',
    };
  }

  async function createSellableFixture(onHand: number) {
    const category = await prisma.category.create({
      data: {
        name: `Phase 3 ${suffix}-${randomUUID().slice(0, 4)}`,
        slug: `phase-3-${suffix}-${randomUUID().slice(0, 4)}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: `Phase 3 product ${suffix}`,
        slug: `phase-3-product-${suffix}-${randomUUID().slice(0, 4)}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `P3-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Phase 3 variant',
        attributes: {},
        price: new Prisma.Decimal('100.00'),
        status: CatalogStatus.ACTIVE,
      },
    });
    const location = await prisma.location.create({
      data: {
        code: `P3-WH-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Phase 3 warehouse',
        type: 'WAREHOUSE',
      },
    });
    const deliveryZone = await prisma.deliveryZone.create({
      data: {
        code: `P3-ZONE-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Baku test zone',
        fee: new Prisma.Decimal('5.00'),
        freeDeliveryMinimum: new Prisma.Decimal('200.00'),
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
        sourceType: 'phase3-fixture',
        sourceDocumentId: `receipt-${suffix}-${randomUUID().slice(0, 4)}`,
        reason: 'Phase 3 checkout fixture',
      },
      actor,
    );
    return {
      variantId: variant.id,
      locationId: location.id,
      deliveryZoneId: deliveryZone.id,
    };
  }

  async function createPickupFixture(onHand: number) {
    const fixture = await createSellableFixture(onHand);
    const pickupLocation = await prisma.pickupLocation.create({
      data: {
        code: `P3-PICKUP-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Phase 3 pickup point',
        addressLine: 'Pickup integration desk',
        workingHours: 'Mon-Sun 10:00-20:00',
        locationId: fixture.locationId,
      },
    });
    return {
      ...fixture,
      pickupLocationId: pickupLocation.id,
    };
  }
});
