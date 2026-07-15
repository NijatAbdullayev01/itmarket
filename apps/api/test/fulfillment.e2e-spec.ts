import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/app.setup';
import { PasswordHasher, Permission } from '../src/auth/auth.module';
import { LocationType, StaffRoleCode } from '../src/generated/prisma/client';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

type AuthenticatedAgent = ReturnType<typeof request.agent>;
type DeliveryZoneResponse = {
  id: string;
  code: string;
  active: boolean;
  fee: string;
};
type PickupLocationResponse = {
  id: string;
  code: string;
  contactLabel: string | null;
  active: boolean;
  location: { id: string };
};

describe('Fulfillment admin PostgreSQL integration', () => {
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

  it('creates and updates delivery zones with audit trail', async () => {
    const admin = await loginAs(StaffRoleCode.ADMIN, Object.values(Permission));
    const code = `DZ-${suffix}`.toUpperCase();

    const created = await admin
      .post('/api/v1/fulfillment/delivery-zones')
      .send({
        code,
        name: 'Fulfillment test zone',
        fee: '5.00',
        freeDeliveryMinimum: '100.00',
        estimatedMinDays: 1,
        estimatedMaxDays: 3,
        coveredAdministrativeAreas: ['Bakı', 'Sumqayıt'],
      })
      .expect(201);

    const createdBody = created.body as DeliveryZoneResponse;
    expect(createdBody.code).toBe(code);
    expect(createdBody.active).toBe(true);

    const updated = await admin
      .patch(`/api/v1/fulfillment/delivery-zones/${createdBody.id}`)
      .send({
        fee: '7.50',
        active: false,
      })
      .expect(200);

    const updatedBody = updated.body as DeliveryZoneResponse;
    expect(updatedBody.fee).toBe('7.5');
    expect(updatedBody.active).toBe(false);

    const audit = await prisma.auditLog.findFirst({
      where: {
        entityType: 'delivery_zone',
        entityId: createdBody.id,
        action: 'fulfillment.delivery-zone.updated',
      },
    });
    expect(audit).not.toBeNull();

    const listed = await admin
      .get('/api/v1/fulfillment/delivery-zones')
      .expect(200);
    expect(
      (listed.body as DeliveryZoneResponse[]).some(
        (zone) => zone.id === createdBody.id,
      ),
    ).toBe(true);
  });

  it('creates pickup locations against active STORE locations', async () => {
    const admin = await loginAs(StaffRoleCode.ADMIN, Object.values(Permission));
    const location = await prisma.location.create({
      data: {
        code: `STORE-${suffix}`.toUpperCase(),
        name: 'Fulfillment pickup store',
        type: LocationType.STORE,
        active: true,
      },
    });
    const code = `PU-${suffix}`.toUpperCase();

    const created = await admin
      .post('/api/v1/fulfillment/pickup-locations')
      .send({
        code,
        name: 'Fulfillment pickup point',
        locationId: location.id,
        addressLine: 'Test pickup address 12',
        workingHours: { mon: '09:00-18:00' },
        contactLabel: 'Pickup desk',
      })
      .expect(201);

    const createdBody = created.body as PickupLocationResponse;
    expect(createdBody.code).toBe(code);
    expect(createdBody.location.id).toBe(location.id);

    const updated = await admin
      .patch(`/api/v1/fulfillment/pickup-locations/${createdBody.id}`)
      .send({
        contactLabel: null,
        active: false,
      })
      .expect(200);

    const updatedBody = updated.body as PickupLocationResponse;
    expect(updatedBody.contactLabel).toBeNull();
    expect(updatedBody.active).toBe(false);
  });

  it('blocks fulfillment mutations without fulfillment.write permission', async () => {
    const viewer = await loginAs(StaffRoleCode.REPORT_VIEWER, [
      Permission.REPORT_READ,
      Permission.CATALOG_READ,
    ]);

    await viewer
      .post('/api/v1/fulfillment/delivery-zones')
      .send({})
      .expect(403);
    await viewer.get('/api/v1/fulfillment/delivery-zones').expect(403);
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

    const email = `fulfillment-${roleCode.toLowerCase()}-${randomUUID().slice(0, 8)}@example.invalid`;
    const password = `phase4-fulfillment-${roleCode.toLowerCase()}-password`;
    await prisma.staffUser.create({
      data: {
        email,
        displayName: `Fulfillment ${roleCode}`,
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
