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
import {
  PasswordHasher,
  Permission,
  type StaffPrincipal,
} from '../src/auth/auth.module';

describe('Phase 2 PostgreSQL integration', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let inventory: InventoryService;
  const suffix = randomUUID().slice(0, 8);
  const actor: StaffPrincipal = {
    id: randomUUID(),
    email: 'integration.invalid@example.invalid',
    displayName: 'Integration fixture',
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

  it('rejects unauthenticated catalog access', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/catalog/products')
      .expect(401);
  });

  it('returns 403 when an authenticated role lacks catalog write', async () => {
    const permission = await prisma.permission.upsert({
      where: { code: Permission.CATALOG_READ },
      create: {
        code: Permission.CATALOG_READ,
        description: Permission.CATALOG_READ,
      },
      update: {},
    });
    const role = await prisma.role.upsert({
      where: { code: 'REPORT_VIEWER' },
      create: { code: 'REPORT_VIEWER', name: 'Report viewer' },
      update: {},
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });
    const email = `report-${suffix}@example.invalid`;
    const password = 'integration-password-only';
    await prisma.staffUser.create({
      data: {
        email,
        displayName: 'Report fixture',
        passwordHash: await new PasswordHasher().hash(password),
        roleId: role.id,
      },
    });
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/v1/staff/auth/login')
      .send({ email, password })
      .expect(201);
    await agent
      .post('/api/v1/catalog/categories')
      .send({
        name: 'Forbidden category',
        slug: `forbidden-${suffix}`,
        status: 'ACTIVE',
      })
      .expect(403);
  });

  it('enforces active barcode uniqueness in PostgreSQL', async () => {
    const category = await prisma.category.create({
      data: {
        name: `Integration ${suffix}`,
        slug: `integration-${suffix}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: `Integration ${suffix}`,
        slug: `integration-product-${suffix}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `INT-${suffix}-1`,
        barcode: `9000${suffix}`,
        name: 'First',
        attributes: {},
        price: new Prisma.Decimal('10.00'),
        status: CatalogStatus.ACTIVE,
      },
    });
    await expect(
      prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: `INT-${suffix}-2`,
          barcode: `9000${suffix}`,
          name: 'Second',
          attributes: {},
          price: new Prisma.Decimal('10.00'),
          status: CatalogStatus.ACTIVE,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('keeps concurrent decrements atomic and writes movement plus audit', async () => {
    const category = await prisma.category.create({
      data: {
        name: `Stock ${suffix}`,
        slug: `stock-${suffix}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: `Stock ${suffix}`,
        slug: `stock-product-${suffix}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `STOCK-${suffix}`,
        name: 'Stock fixture',
        attributes: {},
        price: new Prisma.Decimal('1.00'),
        status: CatalogStatus.ACTIVE,
      },
    });
    const location = await prisma.location.create({
      data: {
        code: `WH-${suffix}`,
        name: 'Integration warehouse',
        type: 'WAREHOUSE',
      },
    });
    await inventory.receipt(
      {
        variantId: variant.id,
        locationId: location.id,
        quantity: 1,
        sourceType: 'integration-fixture',
        sourceDocumentId: `receipt-${suffix}`,
        reason: 'Concurrency fixture receipt',
      },
      actor,
    );

    const attempts = await Promise.allSettled([
      inventory.adjustment(
        {
          variantId: variant.id,
          locationId: location.id,
          quantity: -1,
          sourceType: 'integration-fixture',
          sourceDocumentId: `adjust-a-${suffix}`,
          reason: 'Concurrent decrement A',
        },
        actor,
      ),
      inventory.adjustment(
        {
          variantId: variant.id,
          locationId: location.id,
          quantity: -1,
          sourceType: 'integration-fixture',
          sourceDocumentId: `adjust-b-${suffix}`,
          reason: 'Concurrent decrement B',
        },
        actor,
      ),
    ]);
    expect(
      attempts.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      attempts.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    const balance = await prisma.inventoryBalance.findUniqueOrThrow({
      where: {
        variantId_locationId: {
          variantId: variant.id,
          locationId: location.id,
        },
      },
    });
    expect(balance.onHand).toBe(0);
    expect(
      await prisma.inventoryMovement.count({
        where: { variantId: variant.id, locationId: location.id },
      }),
    ).toBe(2);
    expect(
      await prisma.auditLog.count({
        where: {
          entityType: 'inventory-movement',
          after: { path: ['sourceType'], equals: 'integration-fixture' },
        },
      }),
    ).toBeGreaterThanOrEqual(2);
  });
});
