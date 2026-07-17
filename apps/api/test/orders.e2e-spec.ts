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
import { InventoryService } from '../src/inventory/inventory.module';
import { JobsService } from '../src/jobs/jobs.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

type AuthenticatedAgent = ReturnType<typeof request.agent>;
type OnlineCheckoutResponse = {
  id: string;
  checkoutUrl: string;
};

describe('Orders and fulfillment integration', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let inventory: InventoryService;
  let hasher: PasswordHasher;
  let jobs: JobsService;
  const suffix = randomUUID().slice(0, 8);
  const actor: StaffPrincipal = {
    id: randomUUID(),
    email: 'orders.invalid@example.invalid',
    displayName: 'Orders fixture',
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
    jobs = app.get(JobsService);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('lets an authorized manager progress a pickup cash order to completion', async () => {
    const fixture = await createPickupFixture(1);
    const manager = await loginAs(StaffRoleCode.MANAGER, [
      Permission.ORDERS_READ,
      Permission.FULFILLMENT_WRITE,
    ]);
    const orderId = await createPickupCashOrder(
      fixture.variantId,
      fixture.pickupLocationId,
    );

    await manager.get('/api/v1/orders').expect(200);

    await manager
      .post(`/api/v1/orders/${orderId}/transitions`)
      .send({
        action: 'START_PROCESSING',
        reason: 'Warehouse started packing the pickup order',
      })
      .expect(201)
      .expect(({ body }: { body: { status: string } }) => {
        expect(body.status).toBe('PROCESSING');
      });

    await manager
      .post(`/api/v1/orders/${orderId}/transitions`)
      .send({
        action: 'MARK_READY_FOR_PICKUP',
        reason: 'Order is waiting at the pickup desk',
      })
      .expect(201)
      .expect(
        ({ body }: { body: { status: string; fulfillmentStatus: string } }) => {
          expect(body.status).toBe('READY_FOR_PICKUP');
          expect(body.fulfillmentStatus).toBe('READY_FOR_PICKUP');
        },
      );

    await manager
      .post(`/api/v1/orders/${orderId}/transitions`)
      .send({
        action: 'COMPLETE',
        reason: 'Customer collected the order and paid cash',
      })
      .expect(201)
      .expect(
        ({
          body,
        }: {
          body: {
            status: string;
            paymentStatus: string;
            fulfillmentStatus: string;
          };
        }) => {
          expect(body.status).toBe('COMPLETED');
          expect(body.paymentStatus).toBe('PAID');
          expect(body.fulfillmentStatus).toBe('FULFILLED');
        },
      );

    await manager
      .get(`/api/v1/orders/${orderId}`)
      .expect(200)
      .expect(
        ({
          body,
        }: {
          body: {
            status: string;
            paymentStatus: string;
            fulfillmentStatus: string;
            fulfillmentEvents: Array<{
              eventType: string;
              orderStatus: string;
              fulfillmentStatus: string;
            }>;
          };
        }) => {
          expect(body.status).toBe('COMPLETED');
          expect(body.paymentStatus).toBe('PAID');
          expect(body.fulfillmentStatus).toBe('FULFILLED');
          expect(body.fulfillmentEvents).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                eventType: 'orders.cash.created',
                orderStatus: 'CONFIRMED',
                fulfillmentStatus: 'RESERVED',
              }),
              expect.objectContaining({
                eventType: 'orders.processing.started',
                orderStatus: 'PROCESSING',
                fulfillmentStatus: 'RESERVED',
              }),
              expect.objectContaining({
                eventType: 'orders.pickup.ready',
                orderStatus: 'READY_FOR_PICKUP',
                fulfillmentStatus: 'READY_FOR_PICKUP',
              }),
              expect.objectContaining({
                eventType: 'orders.completed',
                orderStatus: 'COMPLETED',
                fulfillmentStatus: 'FULFILLED',
              }),
            ]),
          );
        },
      );

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expect(order.status).toBe('COMPLETED');
    expect(order.paymentStatus).toBe('PAID');

    expect(
      await prisma.stockReservation.count({
        where: {
          orderId,
          status: 'CONSUMED',
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
    expect(balance.onHand).toBe(0);
    expect(balance.reserved).toBe(0);

    expect(
      await prisma.inventoryMovement.count({
        where: {
          variantId: fixture.variantId,
          locationId: fixture.locationId,
          sourceType: 'order-fulfillment',
          sourceDocumentId: orderId,
        },
      }),
    ).toBe(1);
  });

  it('blocks a cashier from reading staff orders without explicit permission', async () => {
    const cashier = await loginAs(StaffRoleCode.CASHIER, [Permission.POS_SALE]);

    await cashier.get('/api/v1/orders').expect(403);
  });

  it('processes notification outbox entries with the recurring jobs service', async () => {
    const fixture = await createDeliveryFixture(1);
    const cart = await request(app.getHttpServer())
      .post('/api/v1/storefront/cart')
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/storefront/cart/${(cart.body as { id: string }).id}/items`)
      .send({
        variantId: fixture.variantId,
        quantity: 1,
      })
      .expect(201);

    const checkout = await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/online')
      .set('Idempotency-Key', `orders-jobs-${randomUUID()}`)
      .send({
        cartId: (cart.body as { id: string }).id,
        fulfillmentType: 'DELIVERY',
        deliveryZoneId: fixture.deliveryZoneId,
        recipientName: 'Orders integration customer',
        phone: '+994501112233',
        email: 'orders-jobs@example.invalid',
        administrativeArea: 'baku',
        addressLine: 'Integration delivery address',
        paymentMethod: 'CARD',
      })
      .expect(201);

    const pendingBefore = await prisma.notificationOutbox.count({
      where: {
        referenceId: (checkout.body as { id: string }).id,
        status: 'PENDING',
      },
    });
    expect(pendingBefore).toBeGreaterThan(0);

    const processed = await jobs.processNotificationOutbox();
    expect(processed).toBeGreaterThan(0);

    let pendingAfter = await prisma.notificationOutbox.count({
      where: {
        referenceId: (checkout.body as { id: string }).id,
        status: 'PENDING',
      },
    });
    while (pendingAfter > 0) {
      const drained = await jobs.processNotificationOutbox(100);
      if (drained === 0) {
        break;
      }
      pendingAfter = await prisma.notificationOutbox.count({
        where: {
          referenceId: (checkout.body as { id: string }).id,
          status: 'PENDING',
        },
      });
    }

    expect(pendingAfter).toBe(0);
  });

  it('requires refund permission before staff can cancel a paid online order', async () => {
    const fixture = await createDeliveryFixture(1);
    const manager = await loginAs(StaffRoleCode.MANAGER, [
      Permission.ORDERS_READ,
      Permission.FULFILLMENT_WRITE,
    ]);
    const checkout = await createOnlineDeliveryOrder(
      fixture.variantId,
      fixture.deliveryZoneId,
    );
    const attemptToken = checkoutAttemptToken(checkout.checkoutUrl);

    await request(app.getHttpServer())
      .post(`/api/v1/payments/mock/attempts/${attemptToken}/complete`)
      .send({ scenario: 'success' })
      .expect(201);

    await manager
      .post(`/api/v1/orders/${checkout.id}/transitions`)
      .send({
        action: 'CANCEL',
        reason: 'customer asked support to void the paid order',
      })
      .expect(403);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: checkout.id },
    });
    expect(order.status).toBe('CONFIRMED');
    expect(order.paymentStatus).toBe('PAID');
    expect(order.fulfillmentStatus).toBe('RESERVED');
  });

  it('lets a refund-authorized manager issue a partial refund without duplicating retries', async () => {
    const fixture = await createDeliveryFixture(1);
    const manager = await loginAs(StaffRoleCode.MANAGER, [
      Permission.ORDERS_READ,
      Permission.REFUND,
    ]);
    const checkout = await createOnlineDeliveryOrder(
      fixture.variantId,
      fixture.deliveryZoneId,
    );
    const attemptToken = checkoutAttemptToken(checkout.checkoutUrl);

    await request(app.getHttpServer())
      .post(`/api/v1/payments/mock/attempts/${attemptToken}/complete`)
      .send({ scenario: 'success' })
      .expect(201);

    const idempotencyKey = `orders-partial-refund-${checkout.id}`;
    const firstRefund = await manager
      .post(`/api/v1/orders/${checkout.id}/refunds`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        reason: 'partial goodwill refund approved',
        amount: '100.00',
      })
      .expect(201);

    expect((firstRefund.body as { paymentStatus: string }).paymentStatus).toBe(
      'PARTIALLY_REFUNDED',
    );

    const duplicateRefund = await manager
      .post(`/api/v1/orders/${checkout.id}/refunds`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        reason: 'partial goodwill refund approved',
        amount: '100.00',
      })
      .expect(201);

    expect(
      (duplicateRefund.body as { paymentStatus: string }).paymentStatus,
    ).toBe('PARTIALLY_REFUNDED');
    expect(
      await prisma.refund.count({
        where: { payment: { orderId: checkout.id } },
      }),
    ).toBe(1);
    expect(
      await prisma.fulfillmentEvent.findFirst({
        where: {
          orderId: checkout.id,
          eventType: 'mock.payment.refunded',
          paymentStatus: 'PARTIALLY_REFUNDED',
        },
      }),
    ).not.toBeNull();
  });

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
    const password = `orders-${roleCode.toLowerCase()}-password`;
    await prisma.staffUser.create({
      data: {
        email,
        displayName: `${roleCode} orders fixture`,
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

  async function createPickupCashOrder(
    variantId: string,
    pickupLocationId: string,
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
      .set('Idempotency-Key', `orders-cash-${randomUUID()}`)
      .send({
        cartId: (cart.body as { id: string }).id,
        fulfillmentType: 'PICKUP',
        pickupLocationId,
        recipientName: 'Pickup customer',
        phone: '+994509998877',
        email: 'pickup@example.invalid',
        addressLine: 'Pickup counter',
      })
      .expect(201);

    return (order.body as { id: string }).id;
  }

  async function createOnlineDeliveryOrder(
    variantId: string,
    deliveryZoneId: string,
  ): Promise<OnlineCheckoutResponse> {
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
      .set('Idempotency-Key', `orders-online-${randomUUID()}`)
      .send({
        cartId: (cart.body as { id: string }).id,
        fulfillmentType: 'DELIVERY',
        deliveryZoneId,
        recipientName: 'Orders online customer',
        phone: '+994501234567',
        email: 'orders-online@example.invalid',
        administrativeArea: 'baku',
        addressLine: 'Orders online delivery address',
        paymentMethod: 'CARD',
      })
      .expect(201);

    return checkout.body as OnlineCheckoutResponse;
  }

  function checkoutAttemptToken(checkoutUrl: string) {
    const token = new URL(checkoutUrl).searchParams.get('attemptToken');
    if (token === null) {
      throw new Error('attemptToken is missing from checkoutUrl');
    }
    return token;
  }

  async function createPickupFixture(onHand: number) {
    const category = await prisma.category.create({
      data: {
        name: `Orders pickup ${suffix}-${randomUUID().slice(0, 4)}`,
        slug: `orders-pickup-${suffix}-${randomUUID().slice(0, 4)}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: `Orders pickup product ${suffix}`,
        slug: `orders-pickup-product-${suffix}-${randomUUID().slice(0, 4)}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `ORD-PU-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Orders pickup variant',
        attributes: {},
        price: new Prisma.Decimal('129.00'),
        status: CatalogStatus.ACTIVE,
      },
    });
    const location = await prisma.location.create({
      data: {
        code: `ORD-PU-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Orders pickup location',
        type: 'PICKUP',
      },
    });
    const pickupLocation = await prisma.pickupLocation.create({
      data: {
        locationId: location.id,
        code: `PICKUP-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Pickup counter',
        addressLine: 'Pickup desk',
        workingHours: {},
      },
    });
    await inventory.receipt(
      {
        variantId: variant.id,
        locationId: location.id,
        quantity: onHand,
        sourceType: 'orders-pickup-fixture',
        sourceDocumentId: `pickup-receipt-${suffix}-${randomUUID().slice(0, 4)}`,
        reason: 'Orders pickup fixture',
      },
      actor,
    );
    return {
      variantId: variant.id,
      locationId: location.id,
      pickupLocationId: pickupLocation.id,
    };
  }

  async function createDeliveryFixture(onHand: number) {
    const category = await prisma.category.create({
      data: {
        name: `Orders delivery ${suffix}-${randomUUID().slice(0, 4)}`,
        slug: `orders-delivery-${suffix}-${randomUUID().slice(0, 4)}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: `Orders delivery product ${suffix}`,
        slug: `orders-delivery-product-${suffix}-${randomUUID().slice(0, 4)}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `ORD-DL-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Orders delivery variant',
        attributes: {},
        price: new Prisma.Decimal('220.00'),
        status: CatalogStatus.ACTIVE,
      },
    });
    const location = await prisma.location.create({
      data: {
        code: `ORD-DL-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Orders delivery warehouse',
        type: 'WAREHOUSE',
      },
    });
    const deliveryZone = await prisma.deliveryZone.create({
      data: {
        code: `ORD-ZONE-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Orders delivery zone',
        fee: new Prisma.Decimal('7.00'),
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
        sourceType: 'orders-delivery-fixture',
        sourceDocumentId: `delivery-receipt-${suffix}-${randomUUID().slice(0, 4)}`,
        reason: 'Orders delivery fixture',
      },
      actor,
    );
    return {
      variantId: variant.id,
      deliveryZoneId: deliveryZone.id,
    };
  }
});
