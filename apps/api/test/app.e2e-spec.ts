import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApplication } from './../src/app.setup';

describe('API application (integration)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  it('serves versioned metadata and propagates correlation IDs', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1')
      .set('x-correlation-id', 'integration-request-1')
      .expect(200)
      .expect('x-correlation-id', 'integration-request-1');

    expect(response.body).toMatchObject({
      name: '@itmarket/api',
      apiVersion: 'v1',
      environment: 'test',
      status: 'ok',
      releaseSha: 'abcdef1',
    });
  });

  it('applies hardened API response headers', async () => {
    await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect('content-security-policy', /default-src 'none'/)
      .expect('cross-origin-opener-policy', 'same-origin')
      .expect('cross-origin-resource-policy', 'same-site')
      .expect('x-permitted-cross-domain-policies', 'none')
      .expect('x-release-sha', 'abcdef1');
  });

  it('marks auth responses as non-cacheable', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/staff/auth/login')
      .send({})
      .expect(400)
      .expect('cache-control', 'no-store');
  });

  it('rejects cross-origin mutation attempts outside the allowlist', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/staff/auth/login')
      .set('origin', 'https://evil.example.invalid')
      .send({ email: 'missing@example.invalid', password: 'wrong-password' })
      .expect(403)
      .expect((response: { body: unknown }) => {
        const body = response.body as {
          code: string;
          message: string;
          details: null;
          correlationId: string;
        };
        expect(body.code).toBe('ORIGIN_FORBIDDEN');
        expect(body.message).toBe('Request origin is not allowed');
        expect(body.details).toBeNull();
      });
  });

  it('rejects cross-site fetch metadata even without an Origin header', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/staff/auth/login')
      .set('sec-fetch-site', 'cross-site')
      .send({ email: 'missing@example.invalid', password: 'wrong-password' })
      .expect(403);
  });

  it('protects Prometheus metrics with a bearer token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/observability/metrics')
      .expect(404);

    const response = await request(app.getHttpServer())
      .get('/api/v1/observability/metrics')
      .set(
        'authorization',
        'Bearer integration-metrics-token-at-least-32-characters',
      )
      .expect(200)
      .expect('cache-control', 'no-store')
      .expect('content-type', /text\/plain/);

    expect(response.text).toContain('itmarket_http_requests_total');
    expect(response.text).toContain('itmarket_pending_payments');
  });

  it('exposes liveness and real dependency readiness', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health/live')
      .expect(200, { status: 'ok' });

    await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(200, {
        status: 'ready',
        dependencies: { database: 'up', redis: 'up' },
      });
  });

  it('publishes its OpenAPI specification', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/openapi.json')
      .expect(200);

    expect(response.body).toMatchObject({
      info: { title: 'ITMarket API' },
    });
    expect(response.body).toHaveProperty(['paths', '/api/v1/health/ready']);
  });

  it('returns the standard error envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/not-a-route')
      .set('x-correlation-id', 'missing-route-1')
      .expect(404);

    expect(response.body).toEqual({
      code: 'HTTP_404',
      message: 'Cannot GET /api/v1/not-a-route',
      details: null,
      correlationId: 'missing-route-1',
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
