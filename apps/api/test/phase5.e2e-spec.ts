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

  it('completes an idempotent cash sale and decrements stock once', async () => {
    const admin = await loginAs(StaffRoleCode.ADMIN, Object.values(Permission));
    const fixture = await createPosFixture(1);

    const register = await admin
      .post('/api/v1/cash-register/registers')
      .send({
        code: `REG-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Phase 5 register',
        locationId: fixture.locationId,
      })
      .expect(201);

    const shift = await admin
      .post('/api/v1/cash-register/shifts/open')
      .send({
        registerId: (register.body as { id: string }).id,
        openingFloat: '50.00',
      })
      .expect(201);

    await admin
      .get(`/api/v1/pos/lookup?barcode=${fixture.barcode}`)
      .expect(200)
      .expect(({ body }: { body: unknown }) => {
        expect(
          (body as { variant: { available: number } }).variant.available,
        ).toBe(1);
      });

    const salePayload = {
      shiftId: (shift.body as { id: string }).id,
      paymentMethod: 'CASH',
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

    const firstBody = first.body as { id: string };
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
          shiftId: (shift.body as { id: string }).id,
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

    const register = await admin
      .post('/api/v1/cash-register/registers')
      .send({
        code: `REG-${suffix}-${randomUUID().slice(0, 4)}`.toUpperCase(),
        name: 'Discrepancy register',
        locationId: fixture.locationId,
      })
      .expect(201);

    const shift = await cashier
      .post('/api/v1/cash-register/shifts/open')
      .send({
        registerId: (register.body as { id: string }).id,
        openingFloat: '100.00',
      })
      .expect(201);
    const shiftId = (shift.body as { id: string }).id;

    await cashier
      .post(`/api/v1/cash-register/shifts/${shiftId}/movements`)
      .send({
        type: 'CASH_OUT',
        amount: '10.00',
        reason: 'Petty cash payout',
      })
      .expect(201);

    const submitted = await cashier
      .post(`/api/v1/cash-register/shifts/${shiftId}/close`)
      .send({ countedCash: '80.00' })
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
      barcode,
    };
  }
});
