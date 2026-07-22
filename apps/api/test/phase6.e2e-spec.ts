import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/app.setup';
import {
  Permission,
  PasswordHasher,
  type StaffPrincipal,
} from '../src/auth/auth.module';
import { bakuDayKey } from '../src/common/baku-timezone';
import {
  CatalogStatus,
  Prisma,
  StaffRoleCode,
} from '../src/generated/prisma/client';
import { InventoryService } from '../src/inventory/inventory.module';
import {
  MockPaymentProvider,
  MockPaymentScenario,
} from '../src/payments/payments.module';
import {
  OrdersService,
  OrderTransitionAction,
} from '../src/orders/orders.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { JobsService } from '../src/jobs/jobs.module';

type AuthenticatedAgent = ReturnType<typeof request.agent>;

type SalesReportBody = {
  summary: {
    transactionCount: number;
    grossSales: string;
    deliveryFeeTotal: string;
    netSales: string;
    refundTotal: string;
  };
  byDay: Array<{
    day: string;
    transactionCount: number;
    grossSales: string;
    netSales: string;
  }>;
  byChannel: Array<{
    channel: string;
    transactionCount: number;
    grossSales: string;
    netSales: string;
  }>;
  byPaymentMethod: Array<{
    paymentMethod: string;
    transactionCount: number;
    grossSales: string;
    netSales: string;
  }>;
  notes: string[];
};

type LowStockReportBody = {
  threshold: number;
  items: Array<{
    variantId: string;
    available: number;
  }>;
};

type MovementReportBody = {
  items: Array<{
    type: string;
    sourceType: string;
    businessDay: string;
  }>;
};

type ReportExportBody = {
  id: string;
  status: string;
  reportType: string;
  rowCount: number | null;
};

function decimalDelta(current: string, baseline: string): string {
  return new Prisma.Decimal(current).sub(baseline).toFixed(2);
}

function channelDelta(
  body: SalesReportBody,
  baseline: SalesReportBody,
  channel: string,
) {
  const current = body.byChannel.find((entry) => entry.channel === channel);
  const base = baseline.byChannel.find((entry) => entry.channel === channel);
  return {
    transactionCount:
      (current?.transactionCount ?? 0) - (base?.transactionCount ?? 0),
    grossSales: decimalDelta(
      current?.grossSales ?? '0.00',
      base?.grossSales ?? '0.00',
    ),
    netSales: decimalDelta(
      current?.netSales ?? '0.00',
      base?.netSales ?? '0.00',
    ),
  };
}

function paymentMethodDelta(
  body: SalesReportBody,
  baseline: SalesReportBody,
  paymentMethod: string,
) {
  const current = body.byPaymentMethod.find(
    (entry) => entry.paymentMethod === paymentMethod,
  );
  const base = baseline.byPaymentMethod.find(
    (entry) => entry.paymentMethod === paymentMethod,
  );
  return {
    transactionCount:
      (current?.transactionCount ?? 0) - (base?.transactionCount ?? 0),
    grossSales: decimalDelta(
      current?.grossSales ?? '0.00',
      base?.grossSales ?? '0.00',
    ),
    netSales: decimalDelta(
      current?.netSales ?? '0.00',
      base?.netSales ?? '0.00',
    ),
  };
}

describe('Phase 6 PostgreSQL integration', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let inventory: InventoryService;
  let mockProvider: MockPaymentProvider;
  let orders: OrdersService;
  let jobs: JobsService;
  const suffix = randomUUID().slice(0, 8);
  const actor: StaffPrincipal = {
    id: randomUUID(),
    email: 'phase6.invalid@example.invalid',
    displayName: 'Phase 6 fixture',
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
    mockProvider = app.get(MockPaymentProvider);
    orders = app.get(OrdersService);
    jobs = app.get(JobsService);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('reconciles daily sales across COD, paid online, and POS sources', async () => {
    const admin = await loginAs(StaffRoleCode.ADMIN, Object.values(Permission));
    const reportViewer = await loginAs(StaffRoleCode.REPORT_VIEWER, [
      Permission.REPORT_READ,
    ]);

    const onlineFixture = await createOnlineFixture(
      new Prisma.Decimal('240.00'),
    );
    const codFixture = await createOnlineFixture(new Prisma.Decimal('100.00'));
    const posFixture = await createPosFixture(new Prisma.Decimal('75.00'));

    const reportDay = bakuDayKey(new Date());
    const baseline = await reportViewer
      .get(`/api/v1/reports/sales?from=${reportDay}&to=${reportDay}&top=5`)
      .expect(200)
      .then((response) => response.body as SalesReportBody);

    await createCashCheckout(codFixture.variantId, codFixture.deliveryZoneId);
    const paidOnlineCheckout = await createPaidOnlineCheckout(
      onlineFixture.variantId,
      onlineFixture.deliveryZoneId,
    );
    await createFailedOnlineCheckout(
      onlineFixture.variantId,
      onlineFixture.deliveryZoneId,
    );
    await orders.transition(
      paidOnlineCheckout.id,
      {
        action: OrderTransitionAction.CANCEL,
        reason: 'phase 6 refund reconciliation fixture',
      },
      actor,
    );

    const register = await admin
      .post('/api/v1/cash-register/registers')
      .send({
        code: `REG-P6-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Phase 6 register',
        locationId: posFixture.locationId,
      })
      .expect(201);
    const shift = await admin
      .post('/api/v1/cash-register/shifts/open')
      .send({
        registerId: (register.body as { id: string }).id,
        openingFloat: '10.00',
      })
      .expect(201);
    const posSale = await admin
      .post('/api/v1/pos/sales')
      .set('Idempotency-Key', `phase6-pos-${suffix}`)
      .send({
        shiftId: (shift.body as { id: string }).id,
        paymentMethod: 'CASH',
        items: [{ variantId: posFixture.variantId, quantity: 1 }],
      })
      .expect(201);

    await admin
      .post('/api/v1/pos/returns')
      .set('Idempotency-Key', `phase6-pos-return-${suffix}`)
      .send({
        shiftId: (shift.body as { id: string }).id,
        saleId: (posSale.body as { id: string }).id,
        reason: 'Phase 6 POS refund fixture',
        restockToInventory: true,
        items: [
          {
            saleItemId: (posSale.body as { items: Array<{ id: string }> })
              .items[0]!.id,
            quantity: 1,
          },
        ],
      })
      .expect(201);

    await reportViewer
      .get(`/api/v1/reports/sales?from=${reportDay}&to=${reportDay}&top=5`)
      .expect(200)
      .expect(({ body }: { body: SalesReportBody }) => {
        const delta = {
          transactionCount:
            body.summary.transactionCount - baseline.summary.transactionCount,
          grossSales: decimalDelta(
            body.summary.grossSales,
            baseline.summary.grossSales,
          ),
          deliveryFeeTotal: decimalDelta(
            body.summary.deliveryFeeTotal,
            baseline.summary.deliveryFeeTotal,
          ),
          netSales: decimalDelta(
            body.summary.netSales,
            baseline.summary.netSales,
          ),
          refundTotal: decimalDelta(
            body.summary.refundTotal,
            baseline.summary.refundTotal,
          ),
        };
        expect(delta.transactionCount).toBe(3);
        expect(delta.grossSales).toBe('415.00');
        expect(delta.deliveryFeeTotal).toBe('0.00');
        expect(delta.netSales).toBe('105.00');
        expect(delta.refundTotal).toBe('320.00');

        const dayEntry = body.byDay.find((entry) => entry.day === reportDay);
        const baselineDayEntry = baseline.byDay.find(
          (entry) => entry.day === reportDay,
        );
        expect(
          (dayEntry?.transactionCount ?? 0) -
            (baselineDayEntry?.transactionCount ?? 0),
        ).toBe(3);
        expect(
          decimalDelta(
            dayEntry?.grossSales ?? '0.00',
            baselineDayEntry?.grossSales ?? '0.00',
          ),
        ).toBe('415.00');
        expect(
          decimalDelta(
            dayEntry?.netSales ?? '0.00',
            baselineDayEntry?.netSales ?? '0.00',
          ),
        ).toBe('105.00');

        expect(channelDelta(body, baseline, 'ONLINE')).toEqual({
          transactionCount: 2,
          grossSales: '340.00',
          netSales: '105.00',
        });
        expect(channelDelta(body, baseline, 'POS')).toEqual({
          transactionCount: 1,
          grossSales: '75.00',
          netSales: '0.00',
        });

        expect(paymentMethodDelta(body, baseline, 'CARD')).toEqual({
          transactionCount: 1,
          grossSales: '240.00',
          netSales: '0.00',
        });
        expect(paymentMethodDelta(body, baseline, 'CASH')).toEqual({
          transactionCount: 2,
          grossSales: '175.00',
          netSales: '105.00',
        });

        expect(body.notes).toEqual(
          expect.arrayContaining([
            expect.stringContaining('Refund totals reflect'),
            expect.stringContaining('COD orders'),
            expect.stringContaining('POS return totals'),
          ]),
        );
      });

    await reportViewer
      .get(
        `/api/v1/reports/inventory/low-stock?threshold=1&limit=20&locationId=${posFixture.locationId}`,
      )
      .expect(200)
      .expect(({ body }: { body: LowStockReportBody }) => {
        expect(body.threshold).toBe(1);
        expect(body.items).toEqual([
          expect.objectContaining({
            variantId: posFixture.variantId,
            available: 1,
          }),
        ]);
      });

    await reportViewer
      .get(
        `/api/v1/reports/inventory/movements?from=${reportDay}&to=${reportDay}&limit=50`,
      )
      .expect(200)
      .expect(({ body }: { body: MovementReportBody }) => {
        expect(body.items).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: 'SALE',
              sourceType: 'pos-sale',
              businessDay: reportDay,
            }),
          ]),
        );
      });
  });

  it('queues and downloads a sales CSV export through the worker', async () => {
    const reportViewer = await loginAs(StaffRoleCode.REPORT_VIEWER, [
      Permission.REPORT_READ,
    ]);
    const fixture = await createOnlineFixture(new Prisma.Decimal('120.00'));
    const reportDay = bakuDayKey(new Date());
    const baseline = await reportViewer
      .get(`/api/v1/reports/sales?from=${reportDay}&to=${reportDay}&top=20`)
      .expect(200)
      .then((response) => response.body as SalesReportBody);

    await createCashCheckout(fixture.variantId, fixture.deliveryZoneId);

    const afterFixture = await reportViewer
      .get(`/api/v1/reports/sales?from=${reportDay}&to=${reportDay}&top=20`)
      .expect(200)
      .then((response) => response.body as SalesReportBody);
    expect(
      afterFixture.summary.transactionCount - baseline.summary.transactionCount,
    ).toBe(1);

    const queued = await reportViewer
      .post('/api/v1/reports/exports')
      .send({
        reportType: 'SALES',
        from: reportDay,
        to: reportDay,
        top: 20,
      })
      .expect(201);

    const exportJob = queued.body as ReportExportBody;
    expect(exportJob.status).toBe('PENDING');
    expect(exportJob.reportType).toBe('SALES');

    expect(await jobs.processReportExports(5)).toBeGreaterThanOrEqual(1);

    await reportViewer
      .get(`/api/v1/reports/exports/${exportJob.id}`)
      .expect(200)
      .expect(({ body }: { body: ReportExportBody }) => {
        expect(body.status).toBe('COMPLETED');
        expect(body.rowCount).toBeGreaterThan(0);
      });

    await reportViewer
      .get(`/api/v1/reports/exports/${exportJob.id}/download`)
      .expect(200)
      .expect('Content-Type', /text\/csv/)
      .expect(({ text }) => {
        expect(text).toContain(
          'section,primaryKey,secondaryKey,label,transactionCount',
        );
        expect(text).toContain(
          `summary,,,TOTAL,${afterFixture.summary.transactionCount}`,
        );
        expect(text).toContain(`byDay,${reportDay}`);
        expect(text).toContain('byChannel,ONLINE');
      });
  });

  it('reclaims a stale processing export and completes it', async () => {
    const reportViewer = await loginAs(StaffRoleCode.REPORT_VIEWER, [
      Permission.REPORT_READ,
    ]);
    const fixture = await createOnlineFixture(new Prisma.Decimal('120.00'));
    await createCashCheckout(fixture.variantId, fixture.deliveryZoneId);

    const reportDay = bakuDayKey(new Date());
    const queued = await reportViewer
      .post('/api/v1/reports/exports')
      .send({
        reportType: 'SALES',
        from: reportDay,
        to: reportDay,
        top: 20,
      })
      .expect(201);

    const exportJob = queued.body as ReportExportBody;
    await prisma.reportExport.update({
      where: { id: exportJob.id },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(Date.now() - 16 * 60_000),
      },
    });

    expect(await jobs.processReportExports(5)).toBeGreaterThanOrEqual(1);

    await reportViewer
      .get(`/api/v1/reports/exports/${exportJob.id}`)
      .expect(200)
      .expect(({ body }: { body: ReportExportBody }) => {
        expect(body.status).toBe('COMPLETED');
        expect(body.rowCount).toBeGreaterThan(0);
      });
  });

  it('enforces report permissions', async () => {
    const cashier = await loginAs(StaffRoleCode.CASHIER, [Permission.POS_SALE]);
    const reportDay = bakuDayKey(new Date());

    await request(app.getHttpServer())
      .get(`/api/v1/reports/sales?from=${reportDay}&to=${reportDay}`)
      .expect(401);

    await cashier
      .get(`/api/v1/reports/sales?from=${reportDay}&to=${reportDay}`)
      .expect(403);

    await cashier
      .post('/api/v1/reports/exports')
      .send({
        reportType: 'SALES',
        from: reportDay,
        to: reportDay,
      })
      .expect(403);
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
    const password = `phase6-${roleCode.toLowerCase()}-password`;
    await prisma.staffUser.create({
      data: {
        email,
        displayName: `${roleCode} fixture`,
        passwordHash: await new PasswordHasher().hash(password),
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

  async function createCashCheckout(variantId: string, deliveryZoneId: string) {
    const cart = await request(app.getHttpServer())
      .post('/api/v1/storefront/cart')
      .send({})
      .expect(201);
    const cartId = (cart.body as { id: string }).id;
    await request(app.getHttpServer())
      .post(`/api/v1/storefront/cart/${cartId}/items`)
      .send({ variantId, quantity: 1 })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/cash')
      .set('Idempotency-Key', `phase6-cash-${randomUUID()}`)
      .send({
        cartId,
        fulfillmentType: 'DELIVERY',
        deliveryZoneId,
        recipientName: 'Report Customer',
        phone: '+994501234567',
        email: 'phase6-cash@example.invalid',
        administrativeArea: 'baku',
        addressLine: 'Phase 6 cash order address',
      })
      .expect(201);
  }

  async function createPaidOnlineCheckout(
    variantId: string,
    deliveryZoneId: string,
  ) {
    const checkout = await createOnlineCheckout(variantId, deliveryZoneId);
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
    return checkout;
  }

  async function createFailedOnlineCheckout(
    variantId: string,
    deliveryZoneId: string,
  ) {
    const checkout = await createOnlineCheckout(variantId, deliveryZoneId);
    const signed = await mockProvider.createSignedScenario(
      checkoutAttemptToken(checkout.checkoutUrl),
      MockPaymentScenario.FAILURE,
    );
    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/mock')
      .set('Content-Type', 'application/json')
      .set('X-Mock-Signature', signed.signature)
      .send(signed.rawBody)
      .expect(201);
  }

  async function createOnlineCheckout(
    variantId: string,
    deliveryZoneId: string,
  ) {
    const cart = await request(app.getHttpServer())
      .post('/api/v1/storefront/cart')
      .send({})
      .expect(201);
    const cartId = (cart.body as { id: string }).id;
    await request(app.getHttpServer())
      .post(`/api/v1/storefront/cart/${cartId}/items`)
      .send({ variantId, quantity: 1 })
      .expect(201);
    const checkout = await request(app.getHttpServer())
      .post('/api/v1/storefront/checkout/online')
      .set('Idempotency-Key', `phase6-online-${randomUUID()}`)
      .send({
        cartId,
        fulfillmentType: 'DELIVERY',
        deliveryZoneId,
        recipientName: 'Report Customer',
        phone: '+994501234567',
        email: 'phase6-online@example.invalid',
        administrativeArea: 'baku',
        addressLine: 'Phase 6 online order address',
        paymentMethod: 'CARD',
      })
      .expect(201);
    return checkout.body as { id: string; checkoutUrl: string };
  }

  function checkoutAttemptToken(checkoutUrl: string) {
    const token = new URL(checkoutUrl).searchParams.get('attemptToken');
    if (token === null) {
      throw new Error('attemptToken is missing from checkoutUrl');
    }
    return token;
  }

  async function createOnlineFixture(price: Prisma.Decimal) {
    const category = await prisma.category.create({
      data: {
        name: `Phase 6 online ${suffix}-${randomUUID().slice(0, 4)}`,
        slug: `phase-6-online-${suffix}-${randomUUID().slice(0, 4)}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: `Phase 6 online product ${suffix}`,
        slug: `phase-6-online-product-${suffix}-${randomUUID().slice(0, 4)}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `P6-ON-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Phase 6 online variant',
        attributes: {},
        price,
        status: CatalogStatus.ACTIVE,
      },
    });
    const location = await prisma.location.create({
      data: {
        code: `P6-WH-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Phase 6 warehouse',
        type: 'WAREHOUSE',
      },
    });
    const deliveryZone = await prisma.deliveryZone.create({
      data: {
        code: `P6-ZONE-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Phase 6 delivery zone',
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
        quantity: 2,
        sourceType: 'phase6-fixture',
        sourceDocumentId: `receipt-${suffix}-${randomUUID().slice(0, 4)}`,
        reason: 'Phase 6 online fixture',
      },
      actor,
    );
    return {
      variantId: variant.id,
      deliveryZoneId: deliveryZone.id,
    };
  }

  async function createPosFixture(price: Prisma.Decimal) {
    const category = await prisma.category.create({
      data: {
        name: `Phase 6 pos ${suffix}-${randomUUID().slice(0, 4)}`,
        slug: `phase-6-pos-${suffix}-${randomUUID().slice(0, 4)}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: `Phase 6 pos product ${suffix}`,
        slug: `phase-6-pos-product-${suffix}-${randomUUID().slice(0, 4)}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const barcode = `8800${randomUUID().replaceAll('-', '').slice(0, 8)}`;
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `P6-POS-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        barcode,
        name: 'Phase 6 POS variant',
        attributes: {},
        price,
        status: CatalogStatus.ACTIVE,
      },
    });
    const location = await prisma.location.create({
      data: {
        code: `P6-ST-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Phase 6 store',
        type: 'STORE',
      },
    });
    await inventory.receipt(
      {
        variantId: variant.id,
        locationId: location.id,
        quantity: 1,
        sourceType: 'phase6-fixture',
        sourceDocumentId: `receipt-${suffix}-${randomUUID().slice(0, 4)}`,
        reason: 'Phase 6 POS fixture',
      },
      actor,
    );
    return {
      variantId: variant.id,
      locationId: location.id,
      barcode,
    };
  }
});
