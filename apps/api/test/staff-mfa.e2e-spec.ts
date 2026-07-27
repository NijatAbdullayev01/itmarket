import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { generate } from 'otplib';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/app.setup';
import {
  PasswordHasher,
  Permission,
} from '../src/auth/auth.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

describe('Staff MFA (e2e)', () => {
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

  it('enrolls TOTP, challenges on login, and accepts recovery code', async () => {
    const role = await prisma.role.upsert({
      where: { code: 'ADMIN' },
      create: { code: 'ADMIN', name: 'Admin' },
      update: { name: 'Admin' },
    });
    for (const code of Object.values(Permission)) {
      await prisma.permission.upsert({
        where: { code },
        create: { code, description: code },
        update: {},
      });
    }
    const permissions = await prisma.permission.findMany({
      where: { code: { in: Object.values(Permission) } },
      select: { id: true },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
      })),
      skipDuplicates: true,
    });

    const email = `mfa-${suffix}@example.invalid`;
    const password = 'mfa-integration-password-only';
    await prisma.staffUser.create({
      data: {
        email,
        displayName: 'MFA fixture',
        passwordHash: await new PasswordHasher().hash(password),
        roleId: role.id,
        mfaEnabled: false,
      },
    });

    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/v1/staff/auth/login')
      .send({ email, password })
      .expect(201);

    const setup = await agent.post('/api/v1/staff/auth/mfa/setup').expect(201);
    const secret = (setup.body as { secret: string }).secret;
    const totpCode = await generate({ secret });
    expect(typeof totpCode).toBe('string');
    expect(totpCode).toHaveLength(6);

    const enabled = await agent
      .post('/api/v1/staff/auth/mfa/enable')
      .send({ code: totpCode })
      .expect(201);
    const recoveryCodes = (enabled.body as { recoveryCodes: string[] })
      .recoveryCodes;
    expect(recoveryCodes.length).toBeGreaterThan(0);

    await agent.post('/api/v1/staff/auth/logout').expect(201);

    const challenge = await agent
      .post('/api/v1/staff/auth/login')
      .send({ email, password })
      .expect(201);
    expect(challenge.body).toMatchObject({ mfaRequired: true });
    const mfaToken = (challenge.body as { mfaToken: string }).mfaToken;

    await agent
      .post('/api/v1/staff/auth/mfa/verify')
      .send({
        mfaToken,
        recoveryCode: recoveryCodes[0],
      })
      .expect(201);

    await agent.get('/api/v1/staff/auth/me').expect(200);
  });
});

describe('Staff MFA required globally (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const previous = process.env.STAFF_MFA_REQUIRED;

  beforeAll(async () => {
    const databaseName = new URL(process.env.DATABASE_URL!).pathname.slice(1);
    if (!/(?:_ci|_test)$/.test(databaseName)) {
      throw new Error(
        `Integration tests require an isolated *_ci or *_test database, received ${databaseName}`,
      );
    }
    process.env.STAFF_MFA_REQUIRED = 'true';
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
    if (previous === undefined) {
      delete process.env.STAFF_MFA_REQUIRED;
    } else {
      process.env.STAFF_MFA_REQUIRED = previous;
    }
  });

  it('rejects login when MFA is not enrolled', async () => {
    const role = await prisma.role.upsert({
      where: { code: 'ADMIN' },
      create: { code: 'ADMIN', name: 'Admin' },
      update: {},
    });
    const email = `mfa-required-${randomUUID().slice(0, 8)}@example.invalid`;
    const password = 'mfa-required-password-only';
    await prisma.staffUser.create({
      data: {
        email,
        displayName: 'MFA required fixture',
        passwordHash: await new PasswordHasher().hash(password),
        roleId: role.id,
        mfaEnabled: false,
      },
    });

    await request(app.getHttpServer())
      .post('/api/v1/staff/auth/login')
      .send({ email, password })
      .expect(403);
  });
});
