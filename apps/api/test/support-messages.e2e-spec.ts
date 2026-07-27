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
import { SupportMessageStatus } from '../src/generated/prisma/client';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

describe('Support messages live chat (e2e)', () => {
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

  it('starts a thread, exchanges live messages, and transitions status', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/storefront/support-messages')
      .send({
        name: `Aysel ${suffix}`,
        phone: '+994501112233',
        email: `support-${suffix}@example.invalid`,
        body: 'Salam, canlı dəstək lazımdır.',
        pagePath: '/products/demo',
      })
      .expect(201);

    const body = created.body as {
      id: string;
      status: string;
      guestToken: string;
      messages: Array<{ id: string; body: string; senderType: string }>;
    };
    expect(body.status).toBe('PENDING');
    expect(body.guestToken.length).toBeGreaterThan(16);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0]?.senderType).toBe('CUSTOMER');

    const threadId = body.id;
    const guestToken = body.guestToken;

    const customerFollowUp = await request(app.getHttpServer())
      .post(`/api/v1/storefront/support-messages/${threadId}/messages`)
      .set('x-support-guest-token', guestToken)
      .send({
        body: 'İkinci mesajım.',
      })
      .expect(201);
    expect((customerFollowUp.body as { senderType: string }).senderType).toBe(
      'CUSTOMER',
    );

    const loaded = await request(app.getHttpServer())
      .get(`/api/v1/storefront/support-messages/${threadId}`)
      .set('x-support-guest-token', guestToken)
      .expect(200);
    expect(
      (loaded.body as { messages: unknown[] }).messages.length,
    ).toBeGreaterThanOrEqual(2);

    const staff = await loginStaff();
    const listed = await staff.get('/api/v1/support-messages').expect(200);
    expect(
      (listed.body as { items: Array<{ id: string }> }).items.some(
        (item) => item.id === threadId,
      ),
    ).toBe(true);

    const countsBeforeReply = await staff
      .get('/api/v1/support-messages/counts')
      .expect(200);
    expect(
      (countsBeforeReply.body as { pending: number }).pending,
    ).toBeGreaterThanOrEqual(1);

    const staffReply = await staff
      .post(`/api/v1/support-messages/${threadId}/messages`)
      .send({ body: 'Salam, sizə necə kömək edə bilərik?' })
      .expect(201);
    expect((staffReply.body as { senderType: string }).senderType).toBe(
      'STAFF',
    );

    const detail = await staff
      .get(`/api/v1/support-messages/${threadId}`)
      .expect(200);
    expect((detail.body as { status: string }).status).toBe('OPEN');
    expect(
      (detail.body as { messages: unknown[] }).messages.length,
    ).toBeGreaterThanOrEqual(3);

    await staff
      .patch(`/api/v1/support-messages/${threadId}`)
      .send({ status: SupportMessageStatus.CLOSED })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/storefront/support-messages/${threadId}/messages`)
      .set('x-support-guest-token', guestToken)
      .send({ body: 'Bağlı söhbətə yazıram' })
      .expect(400);
  });

  async function loginStaff() {
    const role = await prisma.role.upsert({
      where: { code: 'ADMIN' },
      create: { code: 'ADMIN', name: 'Admin' },
      update: {},
    });
    await prisma.permission.upsert({
      where: { code: Permission.SUPPORT_MESSAGES_MANAGE },
      create: {
        code: Permission.SUPPORT_MESSAGES_MANAGE,
        description: Permission.SUPPORT_MESSAGES_MANAGE,
      },
      update: {},
    });
    const permission = await prisma.permission.findUniqueOrThrow({
      where: { code: Permission.SUPPORT_MESSAGES_MANAGE },
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

    const email = `support-staff-${suffix}@example.invalid`;
    const password = 'support-staff-password-only';
    await prisma.staffUser.create({
      data: {
        email,
        displayName: 'Support staff',
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
