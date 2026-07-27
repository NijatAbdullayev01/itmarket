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
} from '../src/auth/auth.module';
import {
  CatalogStatus,
  CreditApplicationStatus,
  Prisma,
} from '../src/generated/prisma/client';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

describe('Credit applications (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = randomUUID().slice(0, 8);

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
  });

  afterAll(async () => {
    await app?.close();
  });

  it('creates, lists, transitions status, and enqueues status email', async () => {
    const category = await prisma.category.create({
      data: {
        name: `Credit ${suffix}`,
        slug: `credit-cat-${suffix}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: `Credit product ${suffix}`,
        slug: `credit-product-${suffix}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `CR-${suffix}`,
        name: 'Default',
        attributes: {},
        price: new Prisma.Decimal('199.00'),
        status: CatalogStatus.ACTIVE,
      },
    });

    const created = await request(app.getHttpServer())
      .post('/api/v1/storefront/credit-applications')
      .send({
        finCode: 'AB12345',
        phone: '+994501112233',
        email: `credit-${suffix}@example.invalid`,
        productId: product.id,
        variantId: variant.id,
        quantity: 1,
      })
      .expect(201);

    const applicationId = (created.body as { id: string }).id;
    expect((created.body as { status: string }).status).toBe('PENDING');

    const staff = await loginStaff();
    const listed = await staff
      .get('/api/v1/credit-applications')
      .expect(200);
    expect(
      (listed.body as { items: Array<{ id: string }> }).items.some(
        (item) => item.id === applicationId,
      ),
    ).toBe(true);

    await staff
      .patch(`/api/v1/credit-applications/${applicationId}`)
      .send({ status: CreditApplicationStatus.PROCESSING })
      .expect(200);

    const approved = await staff
      .patch(`/api/v1/credit-applications/${applicationId}`)
      .send({ status: CreditApplicationStatus.APPROVED })
      .expect(200);
    expect((approved.body as { status: string }).status).toBe('APPROVED');

    const outbox = await prisma.notificationOutbox.findFirst({
      where: {
        referenceType: 'credit_application',
        referenceId: applicationId,
        topic: 'credit-application.approved',
      },
    });
    expect(outbox).not.toBeNull();
    expect(outbox?.payload).toMatchObject({
      email: `credit-${suffix}@example.invalid`,
    });
  });

  async function loginStaff() {
    const role = await prisma.role.upsert({
      where: { code: 'ADMIN' },
      create: { code: 'ADMIN', name: 'Admin' },
      update: {},
    });
    await prisma.permission.upsert({
      where: { code: Permission.CREDIT_APPLICATIONS_MANAGE },
      create: {
        code: Permission.CREDIT_APPLICATIONS_MANAGE,
        description: Permission.CREDIT_APPLICATIONS_MANAGE,
      },
      update: {},
    });
    const permission = await prisma.permission.findUniqueOrThrow({
      where: { code: Permission.CREDIT_APPLICATIONS_MANAGE },
    });
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permission.id,
        },
      },
      create: { roleId: role.id, permissionId: permission.id },
      update: {},
    });

    const email = `credit-staff-${suffix}@example.invalid`;
    const password = 'credit-staff-password-only';
    await prisma.staffUser.create({
      data: {
        email,
        displayName: 'Credit staff',
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
});
