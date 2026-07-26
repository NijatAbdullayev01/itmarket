import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/app.setup';
import {
  PasswordHasher,
  Permission,
  type StaffPrincipal,
} from '../src/auth/auth.module';
import {
  CatalogStatus,
  Prisma,
  StaffRoleCode,
} from '../src/generated/prisma/client';
import {
  CashMovementType,
  InventoryMovementType,
} from '../src/generated/prisma/enums';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { InventoryService } from '../src/inventory/inventory.module';
import { bakuDayKey } from '../src/common/baku-timezone';
import { SOLE_REGISTER_CODE } from '../src/cash-register/pos-business-day.service';

type AuthenticatedAgent = ReturnType<typeof request.agent>;

describe('Phase 5 PostgreSQL integration', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let inventory: InventoryService;
  const suffix = randomUUID().slice(0, 8);
  const actor: StaffPrincipal = {
    id: randomUUID(),
    email: 'phase5.invalid@example.invalid',
    displayName: 'Phase 5 fixture',
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
  });

  afterAll(async () => {
    await app?.close();
  });

  it('completes an idempotent cash sale without opening a shift and updates daily ledger', async () => {
    const admin = await loginAs(StaffRoleCode.ADMIN, Object.values(Permission));
    const fixture = await createPosFixture(1);

    await admin
      .get(`/api/v1/pos/lookup?barcode=${fixture.barcode}`)
      .expect(200)
      .expect(({ body }: { body: unknown }) => {
        expect(
          (body as { variant: { available: number } }).variant.available,
        ).toBe(1);
      });

    await admin
      .get('/api/v1/pos/products')
      .expect(200)
      .expect(({ body }: { body: unknown }) => {
        const payload = body as {
          total: number;
          items: Array<{ id: string; available: number }>;
        };
        expect(payload.total).toBeGreaterThanOrEqual(1);
        expect(
          payload.items.some((item) => item.id === fixture.variantId),
        ).toBe(true);
      });

    await admin
      .get('/api/v1/pos/products?search=Phase%205%20product')
      .expect(200)
      .expect(({ body }: { body: unknown }) => {
        const payload = body as {
          total: number;
          items: Array<{ id: string; productName: string; available: number }>;
        };
        expect(payload.total).toBeGreaterThanOrEqual(1);
        expect(
          payload.items.some((item) => item.id === fixture.variantId),
        ).toBe(true);
      });

    const salePayload = {
      paymentMethod: 'CASH',
      externalTerminalReference: `RCP-CASH-${suffix}`,
      items: [{ variantId: fixture.variantId, quantity: 1 }],
    };
    const first = await admin
      .post('/api/v1/pos/sales')
      .set('Idempotency-Key', `pos-${suffix}`)
      .send(salePayload)
      .expect(201);
    const retry = await admin
      .post('/api/v1/pos/sales')
      .set('Idempotency-Key', `pos-${suffix}`)
      .send(salePayload)
      .expect(201);

    const firstBody = first.body as {
      id: string;
      shift: { id: string };
      grandTotal: string;
    };
    const retryBody = retry.body as { id: string };
    expect(retryBody.id).toBe(firstBody.id);

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
          type: InventoryMovementType.SALE,
          sourceType: 'pos-sale',
          sourceDocumentId: firstBody.id,
        },
      }),
    ).toBe(1);
    expect(
      await prisma.cashMovement.count({
        where: {
          shiftId: firstBody.shift.id,
          type: CashMovementType.SALE,
          reference: firstBody.id,
        },
      }),
    ).toBe(1);
    expect(
      await prisma.auditLog.count({
        where: {
          entityType: 'pos-sale',
          entityId: firstBody.id,
          action: 'pos-sale.completed',
        },
      }),
    ).toBe(1);

    const summary = await admin
      .get('/api/v1/pos/daily-summary')
      .expect(200);
    const summaryBody = summary.body as {
      businessDate: string;
      cashSales: string;
      saleCount: number;
      sales: Array<{
        id: string;
        items: Array<{
          productName: string;
          sku: string;
          barcode: string | null;
        }>;
      }>;
    };
    expect(summaryBody.businessDate).toBe(bakuDayKey(new Date()));
    expect(Number(summaryBody.cashSales)).toBeGreaterThanOrEqual(
      Number(firstBody.grandTotal),
    );
    expect(summaryBody.saleCount).toBeGreaterThanOrEqual(1);
    const summarySale = summaryBody.sales.find(
      (sale) => sale.id === firstBody.id,
    );
    expect(summarySale?.items.length).toBeGreaterThanOrEqual(1);
    expect(summarySale?.items[0]?.productName).toBeTruthy();
    expect(summarySale?.items[0]?.sku).toBeTruthy();
  });

  it('rejects creating a second cash register', async () => {
    const admin = await loginAs(StaffRoleCode.ADMIN, Object.values(Permission));
    const fixture = await createPosFixture(0);
    await admin
      .post('/api/v1/cash-register/registers')
      .send({
        code: `REG-${suffix}-2`,
        name: 'Second register',
        locationId: fixture.locationId,
      })
      .expect(409);
  });

  it('records shift discrepancy and requires approval before final close', async () => {
    const admin = await loginAs(StaffRoleCode.ADMIN, Object.values(Permission));
    const cashier = await loginAs(StaffRoleCode.CASHIER, [
      Permission.CATALOG_READ,
      Permission.INVENTORY_READ,
      Permission.CASH_SHIFT_OPEN,
      Permission.CASH_SHIFT_CLOSE,
      Permission.CASH_MOVEMENT_WRITE,
      Permission.POS_SALE,
    ]);
    const fixture = await createPosFixture(0);
    const registerId = fixture.registerId;

    const shift = await cashier
      .post('/api/v1/cash-register/shifts/open')
      .send({
        registerId,
        openingFloat: '100.00',
      })
      .expect(201);
    const shiftBody = shift.body as { id: string; expectedCash: string };
    const shiftId = shiftBody.id;

    await cashier
      .post(`/api/v1/cash-register/shifts/${shiftId}/movements`)
      .send({
        type: 'CASH_OUT',
        amount: '10.00',
        reason: 'Petty cash payout',
      })
      .expect(201);

    const expectedAfterOut = new Prisma.Decimal(shiftBody.expectedCash).sub(10);
    const countedCash = expectedAfterOut.sub(10).toFixed(2);

    const submitted = await cashier
      .post(`/api/v1/cash-register/shifts/${shiftId}/close`)
      .send({ countedCash })
      .expect(201);
    expect(
      (submitted.body as { approvalRequired: boolean }).approvalRequired,
    ).toBe(true);
    expect((submitted.body as { shift: { status: string } }).shift.status).toBe(
      'CLOSING',
    );

    const approved = await admin
      .post(`/api/v1/cash-register/shifts/${shiftId}/approve-close`)
      .send({})
      .expect(201);
    expect((approved.body as { status: string }).status).toBe('CLOSED');
    expect((approved.body as { discrepancy: string }).discrepancy).toBe(
      '-10.00',
    );

    expect(
      await prisma.auditLog.count({
        where: {
          entityType: 'cash-shift',
          entityId: shiftId,
          action: 'cash-shift.close-submitted',
        },
      }),
    ).toBe(1);
    expect(
      await prisma.auditLog.count({
        where: {
          entityType: 'cash-shift',
          entityId: shiftId,
          action: 'cash-shift.closed-approved',
        },
      }),
    ).toBe(1);
  });

  it('processes an idempotent cash return and restores stock once', async () => {
    const admin = await loginAs(StaffRoleCode.ADMIN, Object.values(Permission));
    const fixture = await createPosFixture(2);

    const sale = await admin
      .post('/api/v1/pos/sales')
      .set('Idempotency-Key', `sale-return-${suffix}`)
      .send({
        paymentMethod: 'CASH',
        externalTerminalReference: `RCP-RETURN-${suffix}`,
        items: [{ variantId: fixture.variantId, quantity: 2 }],
      })
      .expect(201);
    const saleBody = sale.body as {
      id: string;
      shift: { id: string };
      items: Array<{ id: string }>;
    };

    const returnPayload = {
      saleId: saleBody.id,
      reason: 'Customer returned one item',
      restockToInventory: true,
      items: [{ saleItemId: saleBody.items[0]!.id, quantity: 1 }],
    };
    const firstReturn = await admin
      .post('/api/v1/pos/returns')
      .set('Idempotency-Key', `return-${suffix}`)
      .send(returnPayload)
      .expect(201);
    const retryReturn = await admin
      .post('/api/v1/pos/returns')
      .set('Idempotency-Key', `return-${suffix}`)
      .send(returnPayload)
      .expect(201);

    const firstReturnBody = firstReturn.body as {
      id: string;
      refundAmount: string;
    };
    const retryReturnBody = retryReturn.body as { id: string };
    expect(retryReturnBody.id).toBe(firstReturnBody.id);
    expect(firstReturnBody.refundAmount).toBe('75.00');

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
    expect(
      await prisma.inventoryMovement.count({
        where: {
          variantId: fixture.variantId,
          locationId: fixture.locationId,
          type: InventoryMovementType.RETURN,
          sourceType: 'pos-return',
          sourceDocumentId: firstReturnBody.id,
        },
      }),
    ).toBe(1);
    expect(
      await prisma.cashMovement.count({
        where: {
          shiftId: saleBody.shift.id,
          type: CashMovementType.REFUND,
          reference: firstReturnBody.id,
        },
      }),
    ).toBe(1);
    expect(
      await prisma.auditLog.count({
        where: {
          entityType: 'pos-return',
          entityId: firstReturnBody.id,
          action: 'pos-return.completed',
        },
      }),
    ).toBe(1);

    const saleAfterPartial = await admin
      .get(`/api/v1/pos/sales/${saleBody.id}`)
      .expect(200);
    const saleAfterPartialBody = saleAfterPartial.body as {
      items: Array<{
        id: string;
        quantity: number;
        returnedQuantity: number;
        returnableQuantity: number;
      }>;
    };
    expect(saleAfterPartialBody.items[0]).toMatchObject({
      quantity: 2,
      returnedQuantity: 1,
      returnableQuantity: 1,
    });

    await admin
      .post('/api/v1/pos/returns')
      .set('Idempotency-Key', `return-over-${suffix}`)
      .send({
        saleId: saleBody.id,
        reason: 'Trying to return more than remaining',
        restockToInventory: true,
        items: [{ saleItemId: saleBody.items[0]!.id, quantity: 2 }],
      })
      .expect(409);

    const secondReturn = await admin
      .post('/api/v1/pos/returns')
      .set('Idempotency-Key', `return-rest-${suffix}`)
      .send({
        saleId: saleBody.id,
        reason: 'Customer returned the remaining item',
        restockToInventory: true,
        items: [{ saleItemId: saleBody.items[0]!.id, quantity: 1 }],
      })
      .expect(201);
    expect((secondReturn.body as { refundAmount: string }).refundAmount).toBe(
      '75.00',
    );

    const saleAfterFull = await admin
      .get(`/api/v1/pos/sales/${saleBody.id}`)
      .expect(200);
    expect(
      (saleAfterFull.body as { items: Array<{ returnableQuantity: number }> })
        .items[0]!.returnableQuantity,
    ).toBe(0);

    const summary = await admin.get('/api/v1/pos/daily-summary').expect(200);
    const summarySale = (
      summary.body as {
        sales: Array<{
          id: string;
          returnableQuantity: number;
          externalTerminalReference: string | null;
        }>;
      }
    ).sales.find((entry) => entry.id === saleBody.id);
    expect(summarySale?.returnableQuantity).toBe(0);
    expect(summarySale?.externalTerminalReference).toBe(
      `RCP-RETURN-${suffix}`,
    );
  });

  it('blocks POS returns without refund permission', async () => {
    const admin = await loginAs(StaffRoleCode.ADMIN, Object.values(Permission));
    const cashier = await loginAs(StaffRoleCode.CASHIER, [
      Permission.CATALOG_READ,
      Permission.INVENTORY_READ,
      Permission.CASH_SHIFT_OPEN,
      Permission.CASH_SHIFT_CLOSE,
      Permission.CASH_MOVEMENT_WRITE,
      Permission.POS_SALE,
    ]);
    const fixture = await createPosFixture(1);

    const sale = await cashier
      .post('/api/v1/pos/sales')
      .set('Idempotency-Key', `cashier-sale-${suffix}`)
      .send({
        paymentMethod: 'CASH',
        externalTerminalReference: `RCP-CASHIER-${suffix}`,
        items: [{ variantId: fixture.variantId, quantity: 1 }],
      })
      .expect(201);

    await cashier
      .post('/api/v1/pos/returns')
      .set('Idempotency-Key', `cashier-return-${suffix}`)
      .send({
        saleId: (sale.body as { id: string }).id,
        reason: 'Unauthorized refund attempt',
        items: [
          {
            saleItemId: (sale.body as { items: Array<{ id: string }> })
              .items[0]!.id,
            quantity: 1,
          },
        ],
      })
      .expect(403);
  });

  it('stores installment metadata for external terminal installment sales', async () => {
    const admin = await loginAs(StaffRoleCode.ADMIN, Object.values(Permission));
    const fixture = await createPosFixture(1);

    const sale = await admin
      .post('/api/v1/pos/sales')
      .set('Idempotency-Key', `installment-${suffix}`)
      .send({
        paymentMethod: 'INSTALLMENT',
        externalTerminalReference: 'TERM-INSTALL-001',
        bankName: 'Kapital Bank',
        installmentMonths: 6,
        items: [{ variantId: fixture.variantId, quantity: 1 }],
      })
      .expect(201);

    const saleBody = sale.body as {
      paymentMethod: string;
      payment: {
        bankName: string | null;
        installmentMonths: number | null;
        terminalReference: string | null;
      } | null;
    };
    expect(saleBody.paymentMethod).toBe('INSTALLMENT');
    expect(saleBody.payment).toMatchObject({
      bankName: 'Kapital Bank',
      installmentMonths: 6,
      terminalReference: 'TERM-INSTALL-001',
    });

    const payment = await prisma.posPayment.findFirstOrThrow({
      where: { saleId: (sale.body as { id: string }).id },
    });
    expect(payment.bankName).toBe('Kapital Bank');
    expect(payment.installmentMonths).toBe(6);
    expect(payment.terminalReference).toBe('TERM-INSTALL-001');

    const summary = await admin.get('/api/v1/pos/daily-summary').expect(200);
    expect(
      Number((summary.body as { installmentSales: string }).installmentSales),
    ).toBeGreaterThanOrEqual(75);
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
    const password = `phase5-${roleCode.toLowerCase()}-password`;
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

  async function ensureSoleRegister(locationId: string) {
    const existing = await prisma.cashRegister.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (existing !== null) {
      return prisma.cashRegister.update({
        where: { id: existing.id },
        data: {
          code: SOLE_REGISTER_CODE,
          name: 'Əsas kassa',
          locationId,
          active: true,
        },
      });
    }
    return prisma.cashRegister.create({
      data: {
        code: SOLE_REGISTER_CODE,
        name: 'Əsas kassa',
        locationId,
        active: true,
      },
    });
  }

  async function createPosFixture(onHand: number) {
    const category = await prisma.category.create({
      data: {
        name: `Phase 5 ${suffix}-${randomUUID().slice(0, 4)}`,
        slug: `phase-5-${suffix}-${randomUUID().slice(0, 4)}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: `Phase 5 product ${suffix}`,
        slug: `phase-5-product-${suffix}-${randomUUID().slice(0, 4)}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const barcode = `9900${randomUUID().replaceAll('-', '').slice(0, 8)}`;
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `P5-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        barcode,
        name: 'Phase 5 variant',
        attributes: {},
        price: new Prisma.Decimal('75.00'),
        status: CatalogStatus.ACTIVE,
      },
    });
    const location = await prisma.location.create({
      data: {
        code: `P5-ST-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Phase 5 store',
        type: 'STORE',
      },
    });
    const register = await ensureSoleRegister(location.id);
    if (onHand > 0) {
      await inventory.receipt(
        {
          variantId: variant.id,
          locationId: location.id,
          quantity: onHand,
          sourceType: 'phase5-fixture',
          sourceDocumentId: `receipt-${suffix}-${randomUUID().slice(0, 4)}`,
          reason: 'Phase 5 POS fixture',
        },
        actor,
      );
    }
    return {
      variantId: variant.id,
      locationId: location.id,
      registerId: register.id,
      barcode,
    };
  }
});
