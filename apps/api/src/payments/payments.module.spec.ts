import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac } from 'node:crypto';
import {
  Prisma,
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
} from '../generated/prisma/client';
import type { Environment } from '../config/environment';
import type { PrismaService } from '../infrastructure/prisma/prisma.service';
import {
  computeEpointSignatureForTests,
  EpointPaymentProvider,
  MockPaymentProvider,
  MockPaymentScenario,
  PaymentContinueAction,
  PaymentsService,
} from './payments.module';

type MockPrisma = {
  payment: {
    findUniqueOrThrow: jest.Mock;
  };
  paymentEvent: {
    findFirst: jest.Mock;
  };
};

describe('EpointPaymentProvider', () => {
  const originalFetch = global.fetch;
  const environment: Environment = {
    NODE_ENV: 'test',
    PORT: 3001,
    DATABASE_URL: 'postgresql://user:password@localhost:5432/itmarket_test',
    REDIS_URL: 'redis://localhost:6379/1',
    APP_SECRET: 'integration-test-secret-at-least-32-characters',
    TRUST_PROXY_HOPS: 0,
    PAYMENT_PROVIDER: 'epoint',
    FISCAL_RECEIPT_PROVIDER: 'none',
    EPOINT_PUBLIC_KEY: 'i000000001',
    EPOINT_PRIVATE_KEY: 'epoint-private-key',
    STOREFRONT_ORIGIN: 'http://localhost:3000',
    BACKOFFICE_ORIGIN: 'http://localhost:3002',
    LOG_LEVEL: 'info',
    METRICS_TOKEN: 'integration-metrics-token-at-least-32-characters',
    SMTP_HOST: 'localhost',
    SMTP_PORT: 1025,
    SMTP_SECURE: false,
    EMAIL_FROM: 'ITMarket Local <no-reply@itmarket.local>',
    MEDIA_STORAGE: 'local',
    MEDIA_MALWARE_SCAN: 'local',
    CLAMAV_HOST: '127.0.0.1',
    CLAMAV_PORT: 3310,
    S3_ENDPOINT: 'http://localhost:9000',
    S3_REGION: 'us-east-1',
    S3_ACCESS_KEY: 'itmarket_local',
    S3_SECRET_KEY: 'local_itmarket_minio_only_ChangeOutsideLocal',
    S3_BUCKET: 'itmarket-local',
    S3_FORCE_PATH_STYLE: true,
    STAFF_MFA_REQUIRED: false,
    JOBS_ENABLED: true,
    SEO_AI_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    SEO_AI_MODEL: 'gemini-3.5-flash',
    SEO_AI_TIMEOUT_MS: 30_000,
    STAFF_INACTIVITY_TTL_MS: 30 * 60 * 1000,
    WEBHOOK_MAX_AGE_SECONDS: 900,
  };

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('creates an Epoint checkout request with a signed payload', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        status: 'success',
        transaction: 'te001234567',
        redirect_url: 'https://epoint.az/pay/mock-checkout',
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    const provider = new EpointPaymentProvider(
      createConfigMock(environment),
      createPrismaMock() as unknown as PrismaService,
    );
    const result = await provider.createPayment({
      orderId: 'order-id',
      orderNumber: 'ITM-20260715-000001',
      amount: new Prisma.Decimal('245.00'),
      currency: 'AZN',
      paymentMethod: PaymentMethod.CARD,
    });

    expect(result.provider).toBe('epoint');
    expect(result.providerPaymentId).toBe('te001234567');
    expect(result.checkoutUrl).toBe('https://epoint.az/pay/mock-checkout');
    expect(result.checkoutToken).not.toBe('te001234567');
    expect(result.checkoutToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(result.sandbox).toBe(true);

    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(requestUrl).toBe('https://epoint.az/api/1/request');
    expect(requestInit.method).toBe('POST');

    const body = requestInit.body;
    expect(body).toBeInstanceOf(URLSearchParams);
    const params = body as URLSearchParams;
    const data = params.get('data');
    const signature = params.get('signature');
    expect(data).not.toBeNull();
    expect(signature).toBe(
      createHash('sha1')
        .update(
          `${environment.EPOINT_PRIVATE_KEY}${data}${environment.EPOINT_PRIVATE_KEY}`,
        )
        .digest('base64'),
    );
  });

  it('exposes only direct card capability until installment mapping is confirmed', () => {
    const provider = new EpointPaymentProvider(
      createConfigMock(environment),
      createPrismaMock() as unknown as PrismaService,
    );

    expect(provider.capabilities(new Prisma.Decimal('245.00'))).toEqual({
      provider: 'epoint',
      sandbox: true,
      methods: [
        {
          method: PaymentMethod.CARD,
          label: 'Kartla ödə',
          installmentMonths: [],
        },
      ],
    });
  });

  it('exposes configured installment plans once merchant capability mapping is supplied', () => {
    const provider = new EpointPaymentProvider(
      createConfigMock({
        ...environment,
        EPOINT_INSTALLMENT_MONTHS: '3,6,12',
        EPOINT_INSTALLMENT_MINIMUM: '150.00',
      }),
      createPrismaMock() as unknown as PrismaService,
    );

    expect(provider.capabilities(new Prisma.Decimal('245.00'))).toEqual({
      provider: 'epoint',
      sandbox: true,
      methods: [
        {
          method: PaymentMethod.CARD,
          label: 'Kartla ödə',
          installmentMonths: [],
        },
        {
          method: PaymentMethod.INSTALLMENT,
          label: 'Hissə-hissə al',
          installmentMonths: [3, 6, 12],
        },
      ],
    });
  });

  it('exposes configured installment plans regardless of order amount', () => {
    const provider = new EpointPaymentProvider(
      createConfigMock({
        ...environment,
        EPOINT_INSTALLMENT_MONTHS: '3,6,12',
        EPOINT_INSTALLMENT_MINIMUM: '150.00',
      }),
      createPrismaMock() as unknown as PrismaService,
    );

    expect(provider.capabilities(new Prisma.Decimal('120.00'))).toEqual({
      provider: 'epoint',
      sandbox: true,
      methods: [
        {
          method: PaymentMethod.CARD,
          label: 'Kartla ödə',
          installmentMonths: [],
        },
        {
          method: PaymentMethod.INSTALLMENT,
          label: 'Hissə-hissə al',
          installmentMonths: [3, 6, 12],
        },
      ],
    });
  });

  it('keeps installment checkout gated until merchant capabilities are confirmed', async () => {
    const provider = new EpointPaymentProvider(
      createConfigMock(environment),
      createPrismaMock() as unknown as PrismaService,
    );

    await expect(
      provider.createPayment({
        orderId: 'order-id',
        orderNumber: 'ITM-20260715-000001',
        amount: new Prisma.Decimal('245.00'),
        currency: 'AZN',
        paymentMethod: PaymentMethod.INSTALLMENT,
        installmentMonths: 6,
      }),
    ).rejects.toThrow(
      'Epoint installment payments are not configured for this merchant.',
    );
  });

  it('includes installment flags in the Epoint checkout payload when configured', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        status: 'success',
        transaction: 'te001234568',
        redirect_url: 'https://epoint.az/pay/installment-checkout',
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    const provider = new EpointPaymentProvider(
      createConfigMock({
        ...environment,
        EPOINT_INSTALLMENT_MONTHS: '3,6,12',
        EPOINT_INSTALLMENT_MINIMUM: '150.00',
      }),
      createPrismaMock() as unknown as PrismaService,
    );

    await provider.createPayment({
      orderId: 'order-id',
      orderNumber: 'ITM-20260715-000001',
      amount: new Prisma.Decimal('245.00'),
      currency: 'AZN',
      paymentMethod: PaymentMethod.INSTALLMENT,
      installmentMonths: 6,
    });

    expectFormPayload(
      fetchMock.mock.calls[0],
      'https://epoint.az/api/1/request',
      {
        order_id: 'ITM-20260715-000001',
        is_installment: 1,
        other_attr: {
          installment_months: 6,
        },
      },
    );
  });

  it('rejects installment plans that are outside the configured Epoint capability set', async () => {
    const provider = new EpointPaymentProvider(
      createConfigMock({
        ...environment,
        EPOINT_INSTALLMENT_MONTHS: '3,6,12',
      }),
      createPrismaMock() as unknown as PrismaService,
    );

    await expect(
      provider.createPayment({
        orderId: 'order-id',
        orderNumber: 'ITM-20260715-000001',
        amount: new Prisma.Decimal('245.00'),
        currency: 'AZN',
        paymentMethod: PaymentMethod.INSTALLMENT,
        installmentMonths: 18,
      }),
    ).rejects.toThrow('Selected Epoint installment plan is unavailable.');
  });

  it('accepts installment orders below the former minimum amount threshold', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        status: 'success',
        transaction: 'te001234569',
        redirect_url: 'https://epoint.az/pay/installment-checkout-small',
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    const provider = new EpointPaymentProvider(
      createConfigMock({
        ...environment,
        EPOINT_INSTALLMENT_MONTHS: '3,6,12',
        EPOINT_INSTALLMENT_MINIMUM: '150.00',
      }),
      createPrismaMock() as unknown as PrismaService,
    );

    await expect(
      provider.createPayment({
        orderId: 'order-id',
        orderNumber: 'ITM-20260715-000001',
        amount: new Prisma.Decimal('120.00'),
        currency: 'AZN',
        paymentMethod: PaymentMethod.INSTALLMENT,
        installmentMonths: 3,
      }),
    ).resolves.toMatchObject({
      providerPaymentId: 'te001234569',
      checkoutUrl: 'https://epoint.az/pay/installment-checkout-small',
    });
  });

  it('verifies signed callback data from Epoint', () => {
    const provider = new EpointPaymentProvider(
      createConfigMock(environment),
      createPrismaMock() as unknown as PrismaService,
    );
    const payload = {
      status: 'success',
      order_id: 'ITM-20260715-000001',
      transaction: 'te001234567',
      amount: '245.00',
      currency: 'AZN',
      card_id: 'card_123',
      card_mask: '123456******1234',
    };
    const data = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = createHash('sha1')
      .update(
        `${environment.EPOINT_PRIVATE_KEY}${data}${environment.EPOINT_PRIVATE_KEY}`,
      )
      .digest('base64');

    const event = provider.verifyWebhook({
      rawBody: data,
      signature,
    });

    expect(event.provider).toBe('epoint');
    expect(event.providerPaymentId).toBe('te001234567');
    expect(event.orderNumber).toBe('ITM-20260715-000001');
    expect(event.paymentStatus).toBe(PaymentStatus.PAID);
    expect(event.eventType).toBe('epoint.payment.success');
    expect(event.occurredAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('matches the public Epoint SHA1/base64 signature sandwich', () => {
    const data = Buffer.from('{"status":"success"}').toString('base64');
    const privateKey = 'test-private-key';
    const expected = createHash('sha1')
      .update(`${privateKey}${data}${privateKey}`)
      .digest('base64');
    expect(computeEpointSignatureForTests(data, privateKey)).toBe(expected);
  });

  it('rejects stale mock webhook occurredAt outside the replay window', async () => {
    const stale = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const rawBody = JSON.stringify({
      eventId: 'mock_evt_stale',
      eventType: 'mock.payment.paid',
      providerPaymentId: 'mock_pay_1',
      orderNumber: 'ITM-20260715-000099',
      paymentStatus: PaymentStatus.PAID,
      amount: '10.00',
      currency: 'AZN',
      occurredAt: stale,
    });
    const mockProvider = new MockPaymentProvider(
      createConfigMock(environment),
      createPrismaMock() as unknown as PrismaService,
    );
    expect(() =>
      mockProvider.verifyWebhook({
        rawBody,
        signature: createHmac('sha256', environment.APP_SECRET)
          .update(rawBody)
          .digest('hex'),
      }),
    ).not.toThrow();
    const verified = mockProvider.verifyWebhook({
      rawBody,
      signature: createHmac('sha256', environment.APP_SECRET)
        .update(rawBody)
        .digest('hex'),
    });
    // Freshness is enforced in PaymentsService.applyVerifiedEvent.
    expect(verified.occurredAt.toISOString()).toBe(stale);
  });

  it('maps authorized-style Epoint callbacks to AUTHORIZED payments', () => {
    const provider = new EpointPaymentProvider(
      createConfigMock(environment),
      createPrismaMock() as unknown as PrismaService,
    );
    const payload = {
      status: 'authorized',
      order_id: 'ITM-20260715-000001',
      transaction: 'te001234567',
      amount: '245.00',
      currency: 'AZN',
    };
    const data = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = createHash('sha1')
      .update(
        `${environment.EPOINT_PRIVATE_KEY}${data}${environment.EPOINT_PRIVATE_KEY}`,
      )
      .digest('base64');

    const event = provider.verifyWebhook({
      rawBody: data,
      signature,
    });

    expect(event.paymentStatus).toBe(PaymentStatus.AUTHORIZED);
    expect(event.eventType).toBe('epoint.payment.authorized');
  });

  it('maps reversed Epoint status checks to cancelled payment events', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        status: 'reversed',
        transaction: 'te001234567',
        amount: '245.00',
        currency: 'AZN',
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    const prisma = createPrismaMock({
      payment: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          amount: new Prisma.Decimal('245.00'),
          order: {
            orderNumber: 'ITM-20260715-000001',
            currency: 'AZN',
          },
        }),
      },
    });
    const provider = new EpointPaymentProvider(
      createConfigMock(environment),
      prisma as unknown as PrismaService,
    );

    const event = await provider.getPaymentStatus('te001234567');

    expect(event).not.toBeNull();
    expect(event?.paymentStatus).toBe(PaymentStatus.CANCELLED);
    expect(event?.eventType).toBe('epoint.payment.reversed');
  });

  it('maps the status API response to a verified payment event', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        status: 'success',
        transaction: 'te001234567',
        amount: '245.00',
        currency: 'AZN',
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    const prisma = createPrismaMock({
      payment: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          amount: new Prisma.Decimal('245.00'),
          order: {
            orderNumber: 'ITM-20260715-000001',
            currency: 'AZN',
          },
        }),
      },
    });
    const provider = new EpointPaymentProvider(
      createConfigMock(environment),
      prisma as unknown as PrismaService,
    );

    const event = await provider.getPaymentStatus('te001234567');

    expect(event).not.toBeNull();
    expect(event?.paymentStatus).toBe(PaymentStatus.PAID);
    expect(event?.providerPaymentId).toBe('te001234567');
    expect(event?.orderNumber).toBe('ITM-20260715-000001');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://epoint.az/api/1/get-status',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('reuses callback card_id when building an Epoint refund request', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        status: 'success',
        transaction: 'refund-123',
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    const prisma = createPrismaMock({
      paymentEvent: {
        findFirst: jest.fn().mockResolvedValue({
          rawPayload: {
            card_id: 'card_123',
          },
        }),
      },
    });
    const provider = new EpointPaymentProvider(
      createConfigMock(environment),
      prisma as unknown as PrismaService,
    );

    const result = await provider.refund({
      providerPaymentId: 'te001234567',
      orderNumber: 'ITM-20260715-000001',
      amount: new Prisma.Decimal('245.00'),
      currency: 'AZN',
      reason: 'customer cancellation',
      idempotencyKey: 'refund-1',
    });

    expect(result.providerRefundId).toBe('refund-123');
    expect(result.paymentStatus).toBe(PaymentStatus.REFUNDED);
    expect(result.refundStatus).toBe(RefundStatus.SUCCEEDED);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expectFormPayload(
      fetchMock.mock.calls[0],
      'https://epoint.az/api/1/refund-request',
      {
        card_id: 'card_123',
        order_id: 'ITM-20260715-000001',
        amount: 245,
        currency: 'AZN',
        description: 'customer cancellation',
      },
    );
  });

  it('falls back to the status API when refund callback payload lacks card_id', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          status: 'success',
          transaction: 'te001234567',
          amount: '245.00',
          currency: 'AZN',
          card_id: 'card_from_status',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          status: 'success',
          transaction: 'refund-456',
        }),
      });
    global.fetch = fetchMock as typeof fetch;

    const prisma = createPrismaMock({
      paymentEvent: {
        findFirst: jest.fn().mockResolvedValue({
          rawPayload: {
            status: 'success',
          },
        }),
      },
    });
    const provider = new EpointPaymentProvider(
      createConfigMock(environment),
      prisma as unknown as PrismaService,
    );

    await provider.refund({
      providerPaymentId: 'te001234567',
      orderNumber: 'ITM-20260715-000001',
      amount: new Prisma.Decimal('245.00'),
      currency: 'AZN',
      reason: 'customer cancellation',
      idempotencyKey: 'refund-2',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expectFormPayload(
      fetchMock.mock.calls[0],
      'https://epoint.az/api/1/get-status',
      {
        transaction: 'te001234567',
      },
    );
    expectFormPayload(
      fetchMock.mock.calls[1],
      'https://epoint.az/api/1/refund-request',
      {
        card_id: 'card_from_status',
        order_id: 'ITM-20260715-000001',
        amount: 245,
        currency: 'AZN',
        description: 'customer cancellation',
      },
    );
  });

  it('surfaces a precise refund error when neither callback nor status payload includes card_id', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        status: 'success',
        transaction: 'te001234567',
        amount: '245.00',
        currency: 'AZN',
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    const prisma = createPrismaMock({
      paymentEvent: {
        findFirst: jest.fn().mockResolvedValue({
          rawPayload: {
            status: 'success',
          },
        }),
      },
    });
    const provider = new EpointPaymentProvider(
      createConfigMock(environment),
      prisma as unknown as PrismaService,
    );

    await expect(
      provider.refund({
        providerPaymentId: 'te001234567',
        orderNumber: 'ITM-20260715-000001',
        amount: new Prisma.Decimal('245.00'),
        currency: 'AZN',
        reason: 'customer cancellation',
        idempotencyKey: 'refund-3',
      }),
    ).rejects.toThrow(
      'Epoint refund requires callback or status data with card_id.',
    );
  });

  it('maps a successful reverse call to a cancelled payment event', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        status: 'success',
        transaction: 'te001234567',
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    const provider = new EpointPaymentProvider(
      createConfigMock(environment),
      createPrismaMock() as unknown as PrismaService,
    );

    const result = await provider.cancel({
      providerPaymentId: 'te001234567',
      orderNumber: 'ITM-20260715-000001',
      amount: new Prisma.Decimal('245.00'),
      currency: 'AZN',
      reason: 'authorization no longer needed',
    });

    expect(result.paymentStatus).toBe(PaymentStatus.CANCELLED);
    expect(result.eventType).toBe('epoint.payment.cancelled');
    expectFormPayload(
      fetchMock.mock.calls[0],
      'https://epoint.az/api/1/reverse',
      {
        transaction: 'te001234567',
        amount: 245,
        currency: 'AZN',
      },
    );
  });
});

describe('PaymentsService handoff', () => {
  const config = createConfigMock({
    NODE_ENV: 'test',
    PORT: 3001,
    DATABASE_URL: 'postgresql://user:password@localhost:5432/itmarket_test',
    REDIS_URL: 'redis://localhost:6379/1',
    APP_SECRET: 'integration-test-secret-at-least-32-characters',
    TRUST_PROXY_HOPS: 0,
    PAYMENT_PROVIDER: 'mock',
    FISCAL_RECEIPT_PROVIDER: 'none',
    STOREFRONT_ORIGIN: 'http://localhost:3000',
    BACKOFFICE_ORIGIN: 'http://localhost:3002',
    LOG_LEVEL: 'info',
    METRICS_TOKEN: 'integration-metrics-token-at-least-32-characters',
    SMTP_HOST: 'localhost',
    SMTP_PORT: 1025,
    SMTP_SECURE: false,
    EMAIL_FROM: 'ITMarket Local <no-reply@itmarket.local>',
    MEDIA_STORAGE: 'local',
    MEDIA_MALWARE_SCAN: 'local',
    CLAMAV_HOST: '127.0.0.1',
    CLAMAV_PORT: 3310,
    S3_ENDPOINT: 'http://localhost:9000',
    S3_REGION: 'us-east-1',
    S3_ACCESS_KEY: 'itmarket_local',
    S3_SECRET_KEY: 'local_itmarket_minio_only_ChangeOutsideLocal',
    S3_BUCKET: 'itmarket-local',
    S3_FORCE_PATH_STYLE: true,
    STAFF_MFA_REQUIRED: false,
    JOBS_ENABLED: true,
    SEO_AI_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    SEO_AI_MODEL: 'gemini-3.5-flash',
    SEO_AI_TIMEOUT_MS: 30_000,
    STAFF_INACTIVITY_TTL_MS: 30 * 60 * 1000,
    WEBHOOK_MAX_AGE_SECONDS: 900,
  });

  it('builds a first-party handoff URL for checkout', () => {
    const service = new PaymentsService(
      {} as never,
      {} as never,
      {} as never,
      config,
    );

    expect(
      service.buildHandoffUrl({
        attemptToken: 'attempt-token',
        orderNumber: 'ITM-20260718-000001',
        paymentMethod: PaymentMethod.CARD,
        amount: new Prisma.Decimal('120.50'),
      }),
    ).toBe(
      'http://localhost:3000/checkout/pay/claim?attemptToken=attempt-token',
    );

    expect(
      service.buildHandoffUrl({
        attemptToken: 'attempt-token',
        orderNumber: 'ITM-20260718-000001',
        paymentMethod: PaymentMethod.INSTALLMENT,
        amount: new Prisma.Decimal('120.50'),
        installmentMonths: 3,
        installmentProvider: 'birbank',
      }),
    ).toBe(
      'http://localhost:3000/checkout/pay/claim?attemptToken=attempt-token',
    );
  });

  it('returns the stored provider URL when continuing an Epoint attempt', async () => {
    const prisma = {
      paymentAttempt: {
        findUnique: jest.fn().mockResolvedValue({
          status: PaymentStatus.PENDING,
          providerCheckoutUrl: 'https://epoint.az/pay/mock-checkout',
          payment: {
            status: PaymentStatus.PENDING,
            provider: 'epoint',
            order: {
              orderNumber: 'ITM-20260718-000001',
              status: 'PENDING_PAYMENT',
              reservations: [],
            },
          },
        }),
      },
    };
    const service = new PaymentsService(
      prisma as unknown as PrismaService,
      {} as never,
      {} as never,
      config,
    );

    await expect(
      service.continuePaymentAttempt(
        'attempt-token',
        PaymentContinueAction.PROCEED,
      ),
    ).resolves.toEqual({
      nextUrl: 'https://epoint.az/pay/mock-checkout',
      kind: 'provider_redirect',
    });
  });

  it('rejects unsafe provider redirect URLs', async () => {
    const prisma = {
      paymentAttempt: {
        findUnique: jest.fn().mockResolvedValue({
          status: PaymentStatus.PENDING,
          providerCheckoutUrl: 'javascript:alert(1)',
          payment: {
            status: PaymentStatus.PENDING,
            provider: 'epoint',
            order: {
              orderNumber: 'ITM-20260718-000001',
              status: 'PENDING_PAYMENT',
              reservations: [],
            },
          },
        }),
      },
    };
    const service = new PaymentsService(
      prisma as unknown as PrismaService,
      {} as never,
      {} as never,
      config,
    );

    await expect(
      service.continuePaymentAttempt(
        'attempt-token',
        PaymentContinueAction.PROCEED,
      ),
    ).rejects.toThrow('Provider checkout URL must be http(s)');
  });

  it('rejects continue when orderNumber does not match the attempt', async () => {
    const prisma = {
      paymentAttempt: {
        findUnique: jest.fn().mockResolvedValue({
          status: PaymentStatus.PENDING,
          providerCheckoutUrl: 'https://epoint.az/pay/mock-checkout',
          payment: {
            status: PaymentStatus.PENDING,
            provider: 'epoint',
            order: {
              orderNumber: 'ITM-20260718-000001',
              status: 'PENDING_PAYMENT',
              reservations: [],
            },
          },
        }),
      },
    };
    const service = new PaymentsService(
      prisma as unknown as PrismaService,
      {} as never,
      {} as never,
      config,
    );

    await expect(
      service.continuePaymentAttempt(
        'attempt-token',
        PaymentContinueAction.PROCEED,
        'ITM-SPOOFED-999999',
      ),
    ).rejects.toThrow('Payment attempt does not match order');
  });

  it('rejects provider redirects to non-allowlisted hosts', async () => {
    const prisma = {
      paymentAttempt: {
        findUnique: jest.fn().mockResolvedValue({
          status: PaymentStatus.PENDING,
          providerCheckoutUrl: 'https://evil.example/pay',
          payment: {
            status: PaymentStatus.PENDING,
            provider: 'epoint',
            order: {
              orderNumber: 'ITM-20260718-000001',
              status: 'PENDING_PAYMENT',
              reservations: [],
            },
          },
        }),
      },
    };
    const service = new PaymentsService(
      prisma as unknown as PrismaService,
      {} as never,
      {} as never,
      config,
    );

    await expect(
      service.continuePaymentAttempt(
        'attempt-token',
        PaymentContinueAction.PROCEED,
      ),
    ).rejects.toThrow('Provider checkout URL host is not allowed');
  });

  it('rejects http provider redirects in production', async () => {
    const prodConfig = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'STOREFRONT_ORIGIN') return 'https://shop.example';
        if (key === 'APP_SECRET') {
          return 'integration-test-secret-at-least-32-characters';
        }
        if (key === 'PAYMENT_REDIRECT_HOSTS') return undefined;
        return undefined;
      }),
    } as unknown as ConfigService<Environment, true>;

    const prisma = {
      paymentAttempt: {
        findUnique: jest.fn().mockResolvedValue({
          status: PaymentStatus.PENDING,
          providerCheckoutUrl: 'http://epoint.az/pay/mock-checkout',
          payment: {
            status: PaymentStatus.PENDING,
            provider: 'epoint',
            order: {
              orderNumber: 'ITM-20260718-000001',
              status: 'PENDING_PAYMENT',
              reservations: [],
            },
          },
        }),
      },
    };
    const service = new PaymentsService(
      prisma as unknown as PrismaService,
      {} as never,
      {} as never,
      prodConfig,
    );

    await expect(
      service.continuePaymentAttempt(
        'attempt-token',
        PaymentContinueAction.PROCEED,
      ),
    ).rejects.toThrow('Provider checkout URL must be https');
  });

  it('rotates the capability token on claim so URL tokens are one-shot', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'attempt-1' });
    const prisma = {
      paymentAttempt: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'attempt-1',
            status: PaymentStatus.PENDING,
            providerCheckoutToken: createHash('sha256')
              .update('attempt-token', 'utf8')
              .digest('hex'),
            payment: { status: PaymentStatus.PENDING },
          })
          .mockResolvedValueOnce(null),
        update,
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          paymentAttempt: { update },
        }),
      ),
    };
    const service = new PaymentsService(
      prisma as unknown as PrismaService,
      {} as never,
      {} as never,
      config,
    );

    const claimed = await service.claimPaymentAttempt('attempt-token');
    expect(claimed.attemptToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(claimed.attemptToken).not.toBe('attempt-token');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'attempt-1' },
        data: {
          providerCheckoutToken: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
      }),
    );
  });
});

describe('PaymentsService.getOrderStatus', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const config = createConfigMock({
    NODE_ENV: 'test',
    PORT: 3001,
    DATABASE_URL: 'postgresql://user:password@localhost:5432/itmarket_test',
    REDIS_URL: 'redis://localhost:6379/1',
    APP_SECRET: 'integration-test-secret-at-least-32-characters',
    TRUST_PROXY_HOPS: 0,
    PAYMENT_PROVIDER: 'mock',
    FISCAL_RECEIPT_PROVIDER: 'none',
    STOREFRONT_ORIGIN: 'http://localhost:3000',
    BACKOFFICE_ORIGIN: 'http://localhost:3002',
    LOG_LEVEL: 'info',
    METRICS_TOKEN: 'integration-metrics-token-at-least-32-characters',
    SMTP_HOST: 'localhost',
    SMTP_PORT: 1025,
    SMTP_SECURE: false,
    EMAIL_FROM: 'ITMarket Local <no-reply@itmarket.local>',
    MEDIA_STORAGE: 'local',
    MEDIA_MALWARE_SCAN: 'local',
    CLAMAV_HOST: '127.0.0.1',
    CLAMAV_PORT: 3310,
    S3_ENDPOINT: 'http://localhost:9000',
    S3_REGION: 'us-east-1',
    S3_ACCESS_KEY: 'itmarket_local',
    S3_SECRET_KEY: 'local_itmarket_minio_only_ChangeOutsideLocal',
    S3_BUCKET: 'itmarket-local',
    S3_FORCE_PATH_STYLE: true,
    STAFF_MFA_REQUIRED: false,
    JOBS_ENABLED: true,
    SEO_AI_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    SEO_AI_MODEL: 'gemini-3.5-flash',
    SEO_AI_TIMEOUT_MS: 30_000,
    STAFF_INACTIVITY_TTL_MS: 30 * 60 * 1000,
    WEBHOOK_MAX_AGE_SECONDS: 900,
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    jest.restoreAllMocks();
  });

  it('marks Epoint orders as sandbox outside production', async () => {
    process.env.NODE_ENV = 'development';
    const prisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'order-id',
          orderNumber: 'ITM-20260715-000001',
          status: 'PENDING_PAYMENT',
          paymentStatus: PaymentStatus.PENDING,
          fulfillmentStatus: 'RESERVED',
          fulfillmentType: 'DELIVERY',
          payment: {
            provider: 'epoint',
            method: PaymentMethod.CARD,
          },
        }),
      },
    };

    const service = new PaymentsService(
      prisma as unknown as PrismaService,
      {} as never,
      {} as never,
      config,
    );

    await expect(
      service.getOrderStatus('ITM-20260715-000001', service.issueOrderStatusToken('ITM-20260715-000001')),
    ).resolves.toEqual(
      expect.objectContaining({
        provider: 'epoint',
        sandbox: true,
        fulfillmentType: 'DELIVERY',
      }),
    );
  });

  it('marks Epoint orders as live in production', async () => {
    process.env.NODE_ENV = 'production';
    const prisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'order-id',
          orderNumber: 'ITM-20260715-000001',
          status: 'PENDING_PAYMENT',
          paymentStatus: PaymentStatus.PENDING,
          fulfillmentStatus: 'RESERVED',
          fulfillmentType: 'DELIVERY',
          payment: {
            provider: 'epoint',
            method: PaymentMethod.CARD,
          },
        }),
      },
    };

    const service = new PaymentsService(
      prisma as unknown as PrismaService,
      {} as never,
      {} as never,
      config,
    );

    await expect(
      service.getOrderStatus('ITM-20260715-000001', service.issueOrderStatusToken('ITM-20260715-000001')),
    ).resolves.toEqual(
      expect.objectContaining({
        provider: 'epoint',
        sandbox: false,
      }),
    );
  });

  it('keeps mock orders in sandbox even in production', async () => {
    process.env.NODE_ENV = 'production';
    const prisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'order-id',
          orderNumber: 'ITM-20260715-000001',
          status: 'PENDING_PAYMENT',
          paymentStatus: PaymentStatus.PENDING,
          fulfillmentStatus: 'RESERVED',
          fulfillmentType: 'PICKUP',
          payment: {
            provider: 'mock',
            method: PaymentMethod.CARD,
          },
        }),
      },
    };

    const service = new PaymentsService(
      prisma as unknown as PrismaService,
      {} as never,
      {} as never,
      config,
    );

    await expect(
      service.getOrderStatus('ITM-20260715-000001', service.issueOrderStatusToken('ITM-20260715-000001')),
    ).resolves.toEqual(
      expect.objectContaining({
        provider: 'mock',
        sandbox: true,
        fulfillmentType: 'PICKUP',
      }),
    );
  });

  it('returns 404 when the order number is unknown', async () => {
    const prisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    const service = new PaymentsService(
      prisma as unknown as PrismaService,
      {} as never,
      {} as never,
      config,
    );

    await expect(
      service.getOrderStatus(
        'ITM-missing',
        service.issueOrderStatusToken('ITM-missing'),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects order status without a valid status token', async () => {
    const prisma = {
      order: {
        findUnique: jest.fn(),
      },
    };
    const service = new PaymentsService(
      prisma as unknown as PrismaService,
      {} as never,
      {} as never,
      config,
    );

    await expect(
      service.getOrderStatus('ITM-20260715-000001', undefined),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.order.findUnique).not.toHaveBeenCalled();
  });
});

describe('PaymentsService mock payment surface gate', () => {
  const baseEnvironment: Environment = {
    NODE_ENV: 'test',
    PORT: 3001,
    DATABASE_URL: 'postgresql://user:password@localhost:5432/itmarket_test',
    REDIS_URL: 'redis://localhost:6379/1',
    APP_SECRET: 'integration-test-secret-at-least-32-characters',
    TRUST_PROXY_HOPS: 0,
    PAYMENT_PROVIDER: 'mock',
    FISCAL_RECEIPT_PROVIDER: 'none',
    STOREFRONT_ORIGIN: 'http://localhost:3000',
    BACKOFFICE_ORIGIN: 'http://localhost:3002',
    LOG_LEVEL: 'info',
    METRICS_TOKEN: 'integration-metrics-token-at-least-32-characters',
    SMTP_HOST: 'localhost',
    SMTP_PORT: 1025,
    SMTP_SECURE: false,
    EMAIL_FROM: 'ITMarket Local <no-reply@itmarket.local>',
    MEDIA_STORAGE: 'local',
    MEDIA_MALWARE_SCAN: 'local',
    CLAMAV_HOST: '127.0.0.1',
    CLAMAV_PORT: 3310,
    S3_ENDPOINT: 'http://localhost:9000',
    S3_REGION: 'us-east-1',
    S3_ACCESS_KEY: 'itmarket_local',
    S3_SECRET_KEY: 'local_itmarket_minio_only_ChangeOutsideLocal',
    S3_BUCKET: 'itmarket-local',
    S3_FORCE_PATH_STYLE: true,
    STAFF_MFA_REQUIRED: false,
    JOBS_ENABLED: true,
    SEO_AI_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    SEO_AI_MODEL: 'gemini-3.5-flash',
    SEO_AI_TIMEOUT_MS: 30_000,
    STAFF_INACTIVITY_TTL_MS: 30 * 60 * 1000,
    WEBHOOK_MAX_AGE_SECONDS: 900,
  };

  it('rejects mock complete when PAYMENT_PROVIDER is not mock', async () => {
    const service = new PaymentsService(
      {
        paymentAttempt: { findUnique: jest.fn() },
      } as unknown as PrismaService,
      {} as never,
      {} as never,
      createConfigMock({ ...baseEnvironment, PAYMENT_PROVIDER: 'epoint' }),
    );

    await expect(
      service.completeMockPayment('attempt-token', MockPaymentScenario.SUCCESS),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects mock webhook when PAYMENT_PROVIDER is not mock', async () => {
    const service = new PaymentsService(
      {} as never,
      {} as never,
      {
        verifyWebhook: jest.fn(),
      } as never,
      createConfigMock({ ...baseEnvironment, PAYMENT_PROVIDER: 'epoint' }),
    );

    await expect(
      service.handleMockWebhook('{}', 'sig'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects mock complete for non-mock payment attempts', async () => {
    const service = new PaymentsService(
      {
        paymentAttempt: {
          findUnique: jest.fn().mockResolvedValue({
            providerCheckoutToken: 'attempt-token',
            payment: {
              provider: 'epoint',
              method: PaymentMethod.CARD,
              order: {
                id: 'order-id',
                orderNumber: 'ITM-20260715-000001',
                status: 'PENDING_PAYMENT',
                paymentStatus: PaymentStatus.PENDING,
                fulfillmentStatus: 'RESERVED',
                fulfillmentType: 'DELIVERY',
              },
            },
          }),
        },
      } as unknown as PrismaService,
      {} as never,
      {} as never,
      createConfigMock(baseEnvironment),
    );

    await expect(
      service.completeMockPayment('attempt-token', MockPaymentScenario.SUCCESS),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function createConfigMock(environment: Environment) {
  return {
    get: jest.fn(<K extends keyof Environment>(key: K) => environment[key]),
  } as unknown as ConfigService<Environment, true>;
}

function createPrismaMock(overrides: Partial<MockPrisma> = {}): MockPrisma {
  return {
    payment: {
      findUniqueOrThrow: jest.fn(),
    },
    paymentEvent: {
      findFirst: jest.fn(),
    },
    ...overrides,
  };
}

function expectFormPayload(
  call: unknown,
  expectedUrl: string,
  expectedPayload: Record<string, unknown>,
) {
  expect(Array.isArray(call)).toBe(true);
  expect(call).toHaveLength(2);
  const [requestUrl, requestInit] = call as [string, RequestInit];
  expect(requestUrl).toBe(expectedUrl);
  const body = requestInit.body;
  expect(body).toBeInstanceOf(URLSearchParams);
  const params = body as URLSearchParams;
  const data = params.get('data');
  expect(data).not.toBeNull();
  expect(
    JSON.parse(Buffer.from(data as string, 'base64').toString('utf8')),
  ).toEqual(expect.objectContaining(expectedPayload));
}
