import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import {
  Prisma,
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
} from '../generated/prisma/client';
import type { Environment } from '../config/environment';
import type { PrismaService } from '../infrastructure/prisma/prisma.service';
import {
  EpointPaymentProvider,
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
    PAYMENT_PROVIDER: 'epoint',
    FISCAL_RECEIPT_PROVIDER: 'none',
    EPOINT_PUBLIC_KEY: 'i000000001',
    EPOINT_PRIVATE_KEY: 'epoint-private-key',
    STOREFRONT_ORIGIN: 'http://localhost:3000',
    BACKOFFICE_ORIGIN: 'http://localhost:3002',
    LOG_LEVEL: 'info',
    METRICS_TOKEN: 'integration-metrics-token-at-least-32-characters',
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
    expect(result.checkoutToken).toBe('te001234567');
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
          minimumAmount: '150.00',
        },
      ],
    });
  });

  it('keeps configured installment plans hidden below the merchant minimum amount', () => {
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
          installmentMonths: [],
          minimumAmount: '150.00',
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

  it('rejects installment orders below the configured Epoint minimum amount', async () => {
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
    ).rejects.toThrow(
      'Epoint installment requires minimum order amount of 150.00 AZN.',
    );
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
    PAYMENT_PROVIDER: 'mock',
    FISCAL_RECEIPT_PROVIDER: 'none',
    STOREFRONT_ORIGIN: 'http://localhost:3000',
    BACKOFFICE_ORIGIN: 'http://localhost:3002',
    LOG_LEVEL: 'info',
    METRICS_TOKEN: 'integration-metrics-token-at-least-32-characters',
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
      'http://localhost:3000/checkout/pay?attemptToken=attempt-token&orderNumber=ITM-20260718-000001&paymentMethod=CARD&amount=120.50',
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
      'http://localhost:3000/checkout/pay?attemptToken=attempt-token&orderNumber=ITM-20260718-000001&paymentMethod=INSTALLMENT&amount=120.50&installmentMonths=3&installmentProvider=birbank',
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
});

describe('PaymentsService.getOrderStatus', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const config = createConfigMock({
    NODE_ENV: 'test',
    PORT: 3001,
    DATABASE_URL: 'postgresql://user:password@localhost:5432/itmarket_test',
    REDIS_URL: 'redis://localhost:6379/1',
    APP_SECRET: 'integration-test-secret-at-least-32-characters',
    PAYMENT_PROVIDER: 'mock',
    FISCAL_RECEIPT_PROVIDER: 'none',
    STOREFRONT_ORIGIN: 'http://localhost:3000',
    BACKOFFICE_ORIGIN: 'http://localhost:3002',
    LOG_LEVEL: 'info',
    METRICS_TOKEN: 'integration-metrics-token-at-least-32-characters',
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
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'order-id',
          orderNumber: 'ITM-20260715-000001',
          status: 'PENDING_PAYMENT',
          paymentStatus: PaymentStatus.PENDING,
          fulfillmentStatus: 'PENDING',
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
      service.getOrderStatus('ITM-20260715-000001'),
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
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'order-id',
          orderNumber: 'ITM-20260715-000001',
          status: 'PENDING_PAYMENT',
          paymentStatus: PaymentStatus.PENDING,
          fulfillmentStatus: 'PENDING',
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
      service.getOrderStatus('ITM-20260715-000001'),
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
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'order-id',
          orderNumber: 'ITM-20260715-000001',
          status: 'PENDING_PAYMENT',
          paymentStatus: PaymentStatus.PENDING,
          fulfillmentStatus: 'PENDING',
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
      service.getOrderStatus('ITM-20260715-000001'),
    ).resolves.toEqual(
      expect.objectContaining({
        provider: 'mock',
        sandbox: true,
        fulfillmentType: 'PICKUP',
      }),
    );
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
