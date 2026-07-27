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
  FulfillmentStatus,
  FulfillmentType,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '../src/generated/prisma/client';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

describe('Product reviews moderation (e2e)', () => {
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

  it('keeps unpublished reviews off storefront until staff publishes', async () => {
    const category = await prisma.category.create({
      data: {
        name: `Review ${suffix}`,
        slug: `review-cat-${suffix}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: `Review product ${suffix}`,
        slug: `review-product-${suffix}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `RV-${suffix}`,
        name: 'Default',
        attributes: {},
        price: new Prisma.Decimal('49.00'),
        status: CatalogStatus.ACTIVE,
      },
    });
    const customer = await prisma.customer.create({
      data: {
        email: `reviewer-${suffix}@example.invalid`,
        passwordHash: await new PasswordHasher().hash('reviewer-password'),
        firstName: 'Review',
        lastName: 'Customer',
      },
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: `ITM-REV-${suffix}`,
        status: OrderStatus.COMPLETED,
        paymentStatus: PaymentStatus.PAID,
        fulfillmentStatus: FulfillmentStatus.FULFILLED,
        fulfillmentType: FulfillmentType.PICKUP,
        customerId: customer.id,
        guestEmail: null,
        subtotal: new Prisma.Decimal('49.00'),
        discountTotal: new Prisma.Decimal('0'),
        taxTotal: new Prisma.Decimal('0'),
        deliveryFee: new Prisma.Decimal('0'),
        grandTotal: new Prisma.Decimal('49.00'),
        currency: 'AZN',
        items: {
          create: {
            variantId: variant.id,
            productName: product.name,
            variantName: variant.name,
            sku: variant.sku,
            barcode: null,
            quantity: 1,
            unitPrice: new Prisma.Decimal('49.00'),
            discountTotal: new Prisma.Decimal('0'),
            taxTotal: new Prisma.Decimal('0'),
            lineTotal: new Prisma.Decimal('49.00'),
            currency: 'AZN',
          },
        },
      },
      include: { items: true },
    });
    const orderItem = order.items[0]!;

    const customerAgent = request.agent(app.getHttpServer());
    await customerAgent
      .post('/api/v1/customer/auth/login')
      .send({
        email: customer.email,
        password: 'reviewer-password',
      })
      .expect(201);

    const createdReview = await customerAgent
      .post(
        `/api/v1/customer/orders/${order.id}/items/${orderItem.id}/review`,
      )
      .send({ rating: 5, comment: 'Əla məhsul' })
      .expect(201);
    const reviewId = (createdReview.body as { id: string }).id;

    const beforePublish = await request(app.getHttpServer())
      .get(`/api/v1/storefront/catalog/products/${product.slug}`)
      .expect(200);
    expect(
      (beforePublish.body as { reviews: unknown[] }).reviews,
    ).toHaveLength(0);

    const staff = await loginStaff();
    await staff
      .patch(`/api/v1/product-reviews/${reviewId}`)
      .send({ published: true })
      .expect(200);

    const afterPublish = await request(app.getHttpServer())
      .get(`/api/v1/storefront/catalog/products/${product.slug}`)
      .expect(200);
    expect(
      (afterPublish.body as { reviews: Array<{ id: string; rating: number }> })
        .reviews,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: reviewId, rating: 5 }),
      ]),
    );
  });

  async function loginStaff() {
    const role = await prisma.role.upsert({
      where: { code: 'ADMIN' },
      create: { code: 'ADMIN', name: 'Admin' },
      update: {},
    });
    await prisma.permission.upsert({
      where: { code: Permission.CATALOG_WRITE },
      create: {
        code: Permission.CATALOG_WRITE,
        description: Permission.CATALOG_WRITE,
      },
      update: {},
    });
    const permission = await prisma.permission.findUniqueOrThrow({
      where: { code: Permission.CATALOG_WRITE },
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

    const email = `review-staff-${suffix}@example.invalid`;
    const password = 'review-staff-password-only';
    await prisma.staffUser.create({
      data: {
        email,
        displayName: 'Review staff',
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
