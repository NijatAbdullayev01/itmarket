import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Headers,
  Injectable,
  Module,
  Param,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import {
  createHmac,
  createHash,
  randomUUID,
  timingSafeEqual,
  type BinaryLike,
} from 'node:crypto';
import type { Request } from 'express';
import {
  FulfillmentStatus,
  FulfillmentType,
  type Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  RefundStatus,
  StockReservationStatus,
} from '../generated/prisma/client';
import type { Environment } from '../config/environment';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { recordFulfillmentEvent } from '../orders/fulfillment-events';

const MOCK_PROVIDER_CODE = 'mock';
const EPOINT_PROVIDER_CODE = 'epoint';
const MOCK_HOSTED_CHECKOUT_URL = 'mock://hosted';
const MOCK_INSTALLMENT_MINIMUM = new Prisma.Decimal('150.00');
const MOCK_INSTALLMENT_MONTHS = [3, 6, 9, 12, 18, 24] as const;
const EPOINT_API_ORIGIN = 'https://epoint.az/api/1';

type LockedBalance = {
  id: string;
  reserved: number;
};

type OrderStatusSummary = {
  orderId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  fulfillmentType: FulfillmentType;
  paymentMethod: PaymentMethod | null;
  provider: string | null;
  sandbox: boolean;
};

type InstallmentProviderId = 'birbank' | 'tamkart' | 'leobank';

type CreatePaymentInput = {
  orderId: string;
  orderNumber: string;
  amount: Prisma.Decimal;
  currency: string;
  paymentMethod: PaymentMethod;
  installmentMonths?: number;
  installmentProvider?: InstallmentProviderId;
};

type CreatePaymentResult = {
  provider: string;
  providerPaymentId: string;
  checkoutToken: string;
  checkoutUrl: string;
  sandbox: boolean;
};

type PaymentMethodOption = {
  method: PaymentMethod;
  label: string;
  installmentMonths: number[];
  minimumAmount?: string;
};

type PaymentOptions = {
  provider: string;
  sandbox: boolean;
  methods: PaymentMethodOption[];
};

type EpointInstallmentConfig = {
  months: number[];
  minimumAmount: Prisma.Decimal | null;
};

type VerifiedPaymentEvent = {
  provider: string;
  providerEventId: string;
  providerPaymentId: string;
  orderNumber: string;
  paymentStatus: PaymentStatus;
  eventType: string;
  amount: Prisma.Decimal;
  currency: string;
  rawPayload: Prisma.InputJsonValue;
};

type RefundPaymentInput = {
  providerPaymentId: string;
  orderNumber: string;
  amount: Prisma.Decimal;
  currency: string;
  reason: string;
  idempotencyKey: string;
};

type RefundResult = {
  provider: string;
  providerRefundId: string;
  providerEventId: string;
  providerPaymentId: string;
  paymentStatus: PaymentStatus;
  refundStatus: RefundStatus;
  eventType: string;
  amount: Prisma.Decimal;
  currency: string;
  rawPayload: Prisma.InputJsonValue;
};

type CancelPaymentInput = {
  providerPaymentId: string;
  orderNumber: string;
  amount: Prisma.Decimal;
  currency: string;
  reason: string;
};

type CancelResult = {
  provider: string;
  providerEventId: string;
  providerPaymentId: string;
  paymentStatus: PaymentStatus;
  eventType: string;
  amount: Prisma.Decimal;
  currency: string;
  rawPayload: Prisma.InputJsonValue;
};

type MockRemoteStatus = VerifiedPaymentEvent;

type PaymentStatusResult = VerifiedPaymentEvent | null;

type RawWebhookInput = {
  rawBody: string;
  signature: string | undefined;
};

interface PaymentProvider {
  readonly code: string;

  capabilities(total: Prisma.Decimal): PaymentOptions | Promise<PaymentOptions>;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult>;
  refund(input: RefundPaymentInput): Promise<RefundResult>;
  cancel(input: CancelPaymentInput): Promise<CancelResult>;
  verifyWebhook(input: RawWebhookInput): VerifiedPaymentEvent;
}

export enum MockPaymentScenario {
  SUCCESS = 'success',
  FAILURE = 'failure',
  CANCEL = 'cancel',
  TIMEOUT = 'timeout',
}

export enum PaymentContinueAction {
  PROCEED = 'proceed',
  CANCEL = 'cancel',
}

type PaymentContinueResult = {
  nextUrl: string;
  kind: 'provider_redirect' | 'status';
};

type HandoffUrlInput = {
  attemptToken: string;
  orderNumber: string;
  paymentMethod: PaymentMethod;
  amount: Prisma.Decimal;
  installmentMonths?: number | null;
  installmentProvider?: InstallmentProviderId | null;
};

class PaymentOptionsQuery {
  @IsOptional()
  @IsUUID()
  cartId?: string;
}

class CompleteMockPaymentDto {
  @IsEnum(MockPaymentScenario)
  scenario!: MockPaymentScenario;
}

class ContinuePaymentDto {
  @IsEnum(PaymentContinueAction)
  action!: PaymentContinueAction;
}

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  private readonly stagedStatuses = new Map<string, MockRemoteStatus>();
  readonly code = MOCK_PROVIDER_CODE;

  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly prisma: PrismaService,
  ) {}

  capabilities(total: Prisma.Decimal) {
    const installmentEligible = total.greaterThanOrEqualTo(
      MOCK_INSTALLMENT_MINIMUM,
    );
    return {
      provider: this.code,
      sandbox: true,
      methods: [
        {
          method: PaymentMethod.CARD,
          label: 'Kartla ödə',
          installmentMonths: [] as number[],
        },
        {
          method: PaymentMethod.INSTALLMENT,
          label: 'Hissə-hissə al',
          installmentMonths: installmentEligible
            ? [...MOCK_INSTALLMENT_MONTHS]
            : [],
          minimumAmount: MOCK_INSTALLMENT_MINIMUM.toFixed(2),
        },
      ],
    };
  }

  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const checkoutToken = randomUUID();
    const providerPaymentId = `mock_${randomUUID()}`;
    return Promise.resolve({
      provider: MOCK_PROVIDER_CODE,
      providerPaymentId,
      checkoutToken,
      checkoutUrl: MOCK_HOSTED_CHECKOUT_URL,
      sandbox: true,
    });
  }

  refund(input: RefundPaymentInput): Promise<RefundResult> {
    const providerRefundId = `mock_ref_${randomUUID()}`;
    const providerEventId = `mock_evt_${randomUUID()}`;
    return Promise.resolve({
      provider: MOCK_PROVIDER_CODE,
      providerRefundId,
      providerEventId,
      providerPaymentId: input.providerPaymentId,
      paymentStatus: PaymentStatus.REFUNDED,
      refundStatus: RefundStatus.SUCCEEDED,
      eventType: 'mock.payment.refunded',
      amount: input.amount,
      currency: input.currency,
      rawPayload: {
        providerRefundId,
        providerPaymentId: input.providerPaymentId,
        orderNumber: input.orderNumber,
        amount: input.amount.toFixed(2),
        currency: input.currency,
        reason: input.reason,
        idempotencyKey: input.idempotencyKey,
        occurredAt: new Date().toISOString(),
      },
    });
  }

  cancel(input: CancelPaymentInput): Promise<CancelResult> {
    const providerEventId = `mock_evt_${randomUUID()}`;
    return Promise.resolve({
      provider: MOCK_PROVIDER_CODE,
      providerEventId,
      providerPaymentId: input.providerPaymentId,
      paymentStatus: PaymentStatus.CANCELLED,
      eventType: 'mock.payment.cancelled',
      amount: input.amount,
      currency: input.currency,
      rawPayload: {
        providerPaymentId: input.providerPaymentId,
        orderNumber: input.orderNumber,
        amount: input.amount.toFixed(2),
        currency: input.currency,
        reason: input.reason,
        occurredAt: new Date().toISOString(),
      },
    });
  }

  async createSignedScenario(
    attemptToken: string,
    scenario: MockPaymentScenario,
  ): Promise<{ rawBody: string; signature: string }> {
    const payload = await this.buildRemoteEvent(attemptToken, scenario);
    const rawBody = JSON.stringify(payload);
    return {
      rawBody,
      signature: this.sign(rawBody),
    };
  }

  async stageScenario(
    attemptToken: string,
    scenario: MockPaymentScenario,
  ): Promise<MockRemoteStatus | null> {
    if (scenario === MockPaymentScenario.TIMEOUT) {
      return null;
    }
    const payload = await this.buildRemoteEvent(attemptToken, scenario);
    const event = this.toVerifiedEvent(payload);
    this.stagedStatuses.set(event.providerPaymentId, event);
    return event;
  }

  getPaymentStatus(
    providerPaymentId: string,
  ): Promise<MockRemoteStatus | null> {
    return Promise.resolve(this.stagedStatuses.get(providerPaymentId) ?? null);
  }

  verifyWebhook(input: RawWebhookInput): VerifiedPaymentEvent {
    const { rawBody, signature } = input;
    if (signature === undefined || signature.trim() === '') {
      throw new BadRequestException('Missing mock signature header');
    }
    const expected = this.sign(rawBody);
    if (!safeEqual(expected, signature)) {
      throw new BadRequestException('Invalid mock signature');
    }
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }

    const providerEventId = stringField(payload.eventId, 'eventId');
    const providerPaymentId = stringField(
      payload.providerPaymentId,
      'providerPaymentId',
    );
    const orderNumber = stringField(payload.orderNumber, 'orderNumber');
    const currency = stringField(payload.currency, 'currency');
    const amount = new Prisma.Decimal(stringField(payload.amount, 'amount'));
    const eventType = stringField(payload.eventType, 'eventType');
    const paymentStatus = paymentStatusField(payload.paymentStatus);
    return this.toVerifiedEvent({
      eventId: providerEventId,
      providerPaymentId,
      orderNumber,
      paymentStatus,
      eventType,
      amount: amount.toFixed(2),
      currency,
      occurredAt: stringField(payload.occurredAt, 'occurredAt'),
    });
  }

  private async buildRemoteEvent(
    attemptToken: string,
    scenario: MockPaymentScenario,
  ) {
    const attempt = await this.prisma.paymentAttempt.findUniqueOrThrow({
      where: { providerCheckoutToken: attemptToken },
      include: {
        payment: {
          include: {
            order: true,
          },
        },
      },
    });
    if (attempt.providerPaymentId === null) {
      throw new BadRequestException('Provider payment id is missing');
    }
    const paymentStatus =
      scenario === MockPaymentScenario.SUCCESS
        ? PaymentStatus.PAID
        : scenario === MockPaymentScenario.FAILURE
          ? PaymentStatus.FAILED
          : PaymentStatus.CANCELLED;
    const eventType =
      paymentStatus === PaymentStatus.PAID
        ? 'mock.payment.paid'
        : paymentStatus === PaymentStatus.FAILED
          ? 'mock.payment.failed'
          : 'mock.payment.cancelled';
    return {
      eventId: `mock_evt_${randomUUID()}`,
      eventType,
      providerPaymentId: attempt.providerPaymentId,
      orderNumber: attempt.payment.order.orderNumber,
      paymentStatus,
      amount: attempt.amount.toFixed(2),
      currency: attempt.currency,
      occurredAt: new Date().toISOString(),
    };
  }

  private toVerifiedEvent(payload: {
    eventId: string;
    eventType: string;
    providerPaymentId: string;
    orderNumber: string;
    paymentStatus: PaymentStatus;
    amount: string;
    currency: string;
    occurredAt: string;
  }): MockRemoteStatus {
    return {
      provider: MOCK_PROVIDER_CODE,
      providerEventId: payload.eventId,
      providerPaymentId: payload.providerPaymentId,
      orderNumber: payload.orderNumber,
      paymentStatus: payload.paymentStatus,
      eventType: payload.eventType,
      amount: new Prisma.Decimal(payload.amount),
      currency: payload.currency,
      rawPayload: payload,
    };
  }

  private sign(rawBody: BinaryLike) {
    return createHmac('sha256', this.config.get('APP_SECRET', { infer: true }))
      .update(rawBody)
      .digest('hex');
  }
}

@Injectable()
export class EpointPaymentProvider implements PaymentProvider {
  readonly code = EPOINT_PROVIDER_CODE;

  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly prisma: PrismaService,
  ) {}

  capabilities(total: Prisma.Decimal): PaymentOptions {
    this.credentials();
    const installment = this.installmentConfig();
    return {
      provider: this.code,
      sandbox: this.isSandbox(),
      methods: [
        {
          method: PaymentMethod.CARD,
          label: 'Kartla ödə',
          installmentMonths: [],
        },
        ...(installment.months.length === 0
          ? []
          : [
              {
                method: PaymentMethod.INSTALLMENT,
                label: 'Hissə-hissə al',
                installmentMonths: isInstallmentEligible(
                  total,
                  installment.minimumAmount,
                )
                  ? installment.months
                  : [],
                ...(installment.minimumAmount === null
                  ? {}
                  : {
                      minimumAmount: installment.minimumAmount.toFixed(2),
                    }),
              },
            ]),
      ],
    };
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const installment = this.installmentConfig();
    if (input.paymentMethod === PaymentMethod.INSTALLMENT) {
      if (installment.months.length === 0) {
        throw new ServiceUnavailableException(
          'Epoint installment payments are not configured for this merchant.',
        );
      }
      if (
        input.installmentMonths === undefined ||
        !installment.months.includes(input.installmentMonths)
      ) {
        throw new BadRequestException(
          'Selected Epoint installment plan is unavailable.',
        );
      }
      if (!isInstallmentEligible(input.amount, installment.minimumAmount)) {
        throw new BadRequestException(
          installment.minimumAmount === null
            ? 'Selected Epoint installment plan is unavailable.'
            : `Epoint installment requires minimum order amount of ${installment.minimumAmount.toFixed(2)} ${input.currency}.`,
        );
      }
    }

    const payload: Record<string, unknown> = {
      public_key: this.credentials().publicKey,
      amount: decimalToNumber(input.amount),
      currency: input.currency,
      language: 'az',
      order_id: input.orderNumber,
      description: `ITMarket order ${input.orderNumber}`,
      success_redirect_url: this.statusUrl(input.orderNumber),
      error_redirect_url: this.statusUrl(input.orderNumber),
      ...(input.paymentMethod === PaymentMethod.INSTALLMENT
        ? {
            is_installment: 1,
            other_attr: {
              installment_months: input.installmentMonths,
            },
          }
        : {}),
    };
    const response = await this.post('/request', payload);
    if (response.status !== 'success') {
      throw new ServiceUnavailableException(
        `Epoint checkout creation failed: ${stringOrFallback(response.message, 'unknown provider error')}`,
      );
    }

    const providerPaymentId = stringField(response.transaction, 'transaction');
    const checkoutUrl = stringField(response.redirect_url, 'redirect_url');

    return {
      provider: this.code,
      providerPaymentId,
      checkoutToken: providerPaymentId,
      checkoutUrl,
      sandbox: this.isSandbox(),
    };
  }

  async getPaymentStatus(
    providerPaymentId: string,
  ): Promise<PaymentStatusResult> {
    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { providerPaymentId },
      include: {
        order: {
          select: {
            orderNumber: true,
            currency: true,
          },
        },
      },
    });
    const response = await this.fetchStatusPayload(providerPaymentId);
    const paymentStatus = paymentStatusFromEpoint(
      stringOrFallback(response.status, 'server_error'),
    );
    if (
      paymentStatus === null ||
      paymentStatus === PaymentStatus.PENDING ||
      paymentStatus === PaymentStatus.REFUNDED
    ) {
      return null;
    }

    return {
      provider: this.code,
      providerEventId: epointEventId(
        providerPaymentId,
        stringifyForSignature(response),
      ),
      providerPaymentId,
      orderNumber: payment.order.orderNumber,
      paymentStatus,
      eventType: `epoint.payment.${epointStatusLabel(response.status)}`,
      amount: decimalFromUnknown(response.amount, payment.amount),
      currency: stringOrFallback(response.currency, payment.order.currency),
      rawPayload: response as Prisma.InputJsonValue,
    };
  }

  async refund(input: RefundPaymentInput): Promise<RefundResult> {
    const cardId = await this.cardIdForRefund(input.providerPaymentId);
    const response = await this.post('/refund-request', {
      public_key: this.credentials().publicKey,
      language: 'az',
      card_id: cardId,
      order_id: input.orderNumber,
      amount: decimalToNumber(input.amount),
      currency: input.currency,
      description: input.reason,
    });
    if (response.status !== 'success') {
      throw new ServiceUnavailableException(
        `Epoint refund failed: ${stringOrFallback(response.message, 'unknown provider error')}`,
      );
    }

    const providerRefundId = stringOrFallback(
      response.transaction,
      `epoint_ref_${randomUUID()}`,
    );
    return {
      provider: this.code,
      providerRefundId,
      providerEventId: `epoint.refund.${providerRefundId}.${input.idempotencyKey}`,
      providerPaymentId: input.providerPaymentId,
      paymentStatus: PaymentStatus.REFUNDED,
      refundStatus: RefundStatus.SUCCEEDED,
      eventType: 'epoint.payment.refunded',
      amount: input.amount,
      currency: input.currency,
      rawPayload: response as Prisma.InputJsonValue,
    };
  }

  async cancel(input: CancelPaymentInput): Promise<CancelResult> {
    const response = await this.post('/reverse', {
      public_key: this.credentials().publicKey,
      language: 'az',
      transaction: input.providerPaymentId,
      amount: decimalToNumber(input.amount),
      currency: input.currency,
    });
    if (response.status !== 'success') {
      throw new ServiceUnavailableException(
        `Epoint cancellation failed: ${stringOrFallback(response.message, 'unknown provider error')}`,
      );
    }

    return {
      provider: this.code,
      providerEventId: `epoint.reverse.${input.providerPaymentId}.${digestHex(
        stringifyForSignature(response),
      )}`,
      providerPaymentId: input.providerPaymentId,
      paymentStatus: PaymentStatus.CANCELLED,
      eventType: 'epoint.payment.cancelled',
      amount: input.amount,
      currency: input.currency,
      rawPayload: response as Prisma.InputJsonValue,
    };
  }

  verifyWebhook(input: RawWebhookInput): VerifiedPaymentEvent {
    const signature = input.signature?.trim();
    if (signature === undefined || signature.length === 0) {
      throw new BadRequestException('Missing Epoint signature');
    }
    const { privateKey } = this.credentials();
    const expected = epointSignature(input.rawBody, privateKey);
    if (!safeEqual(expected, signature)) {
      throw new BadRequestException('Invalid Epoint signature');
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(
        Buffer.from(input.rawBody, 'base64').toString('utf8'),
      ) as Record<string, unknown>;
    } catch {
      throw new BadRequestException('Invalid Epoint callback payload');
    }

    const providerPaymentId = stringField(payload.transaction, 'transaction');
    const orderNumber = stringField(payload.order_id, 'order_id');
    const rawStatus = stringField(payload.status, 'status');
    const paymentStatus = paymentStatusFromEpoint(rawStatus);
    if (paymentStatus === null) {
      throw new BadRequestException('Unsupported Epoint payment status');
    }

    return {
      provider: this.code,
      providerEventId: epointEventId(providerPaymentId, input.rawBody),
      providerPaymentId,
      orderNumber,
      paymentStatus,
      eventType: `epoint.payment.${rawStatus}`,
      amount: decimalFromUnknown(payload.amount, new Prisma.Decimal('0')),
      currency: stringOrFallback(payload.currency, 'AZN'),
      rawPayload: payload as Prisma.InputJsonValue,
    };
  }

  private credentials() {
    const publicKey = this.config.get('EPOINT_PUBLIC_KEY', { infer: true });
    const privateKey = this.config.get('EPOINT_PRIVATE_KEY', { infer: true });
    if (publicKey === undefined || privateKey === undefined) {
      throw new ServiceUnavailableException(
        'PAYMENT_PROVIDER=epoint requires EPOINT_PUBLIC_KEY and EPOINT_PRIVATE_KEY.',
      );
    }
    return { publicKey, privateKey };
  }

  private isSandbox() {
    return this.config.get('NODE_ENV', { infer: true }) !== 'production';
  }

  private installmentConfig(): EpointInstallmentConfig {
    return epointInstallmentConfigFromEnvironment(
      this.config.get('EPOINT_INSTALLMENT_MONTHS', { infer: true }),
      this.config.get('EPOINT_INSTALLMENT_MINIMUM', { infer: true }),
    );
  }

  private statusUrl(orderNumber: string) {
    const storefrontOrigin = this.config.get('STOREFRONT_ORIGIN', {
      infer: true,
    });
    const url = new URL('/checkout/status', storefrontOrigin);
    url.searchParams.set('orderNumber', orderNumber);
    return url.toString();
  }

  private async post(endpoint: string, payload: Record<string, unknown>) {
    const { privateKey } = this.credentials();
    const data = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = epointSignature(data, privateKey);
    const response = await fetch(`${EPOINT_API_ORIGIN}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        data,
        signature,
      }),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Epoint request ${endpoint} failed with HTTP ${response.status}`,
      );
    }

    return (await response.json()) as Record<string, unknown>;
  }

  private fetchStatusPayload(providerPaymentId: string) {
    return this.post('/get-status', {
      public_key: this.credentials().publicKey,
      transaction: providerPaymentId,
    });
  }

  private async cardIdForRefund(providerPaymentId: string) {
    const event = await this.prisma.paymentEvent.findFirst({
      where: {
        providerPaymentId,
        status: PaymentStatus.PAID,
      },
      orderBy: { createdAt: 'desc' },
      select: { rawPayload: true },
    });
    const eventCardId = jsonStringField(event?.rawPayload ?? null, 'card_id');
    if (eventCardId !== undefined) {
      return eventCardId;
    }
    const statusPayload = await this.fetchStatusPayload(providerPaymentId);
    const statusCardId = jsonStringField(
      statusPayload as Prisma.JsonValue,
      'card_id',
    );
    if (statusCardId !== undefined) {
      return statusCardId;
    }
    throw new ServiceUnavailableException(
      'Epoint refund requires callback or status data with card_id.',
    );
  }
}

@Injectable()
class PaymentProviderRegistry {
  private readonly providers: Map<string, PaymentProvider>;

  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly mockProvider: MockPaymentProvider,
    private readonly epointProvider: EpointPaymentProvider,
  ) {
    this.providers = new Map(
      [this.mockProvider, this.epointProvider].map((provider) => [
        provider.code,
        provider,
      ]),
    );
  }

  current(): PaymentProvider {
    return this.byCode(this.config.get('PAYMENT_PROVIDER', { infer: true }));
  }

  byCode(code: string): PaymentProvider {
    const provider = this.providers.get(code.toLowerCase());
    if (provider === undefined) {
      throw new InternalServerErrorException(
        `Unsupported payment provider "${code}"`,
      );
    }
    return provider;
  }
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: PaymentProviderRegistry,
    private readonly mockProvider: MockPaymentProvider,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  async paymentOptions(cartId?: string) {
    const total =
      cartId === undefined
        ? new Prisma.Decimal(0)
        : await this.cartSubtotal(cartId);
    return this.providerRegistry.current().capabilities(total);
  }

  buildHandoffUrl(input: HandoffUrlInput): string {
    const storefrontOrigin = this.config.get('STOREFRONT_ORIGIN', {
      infer: true,
    });
    const url = new URL('/checkout/pay', storefrontOrigin);
    url.searchParams.set('attemptToken', input.attemptToken);
    url.searchParams.set('orderNumber', input.orderNumber);
    url.searchParams.set('paymentMethod', input.paymentMethod);
    url.searchParams.set('amount', input.amount.toFixed(2));
    if (
      input.installmentMonths !== undefined &&
      input.installmentMonths !== null
    ) {
      url.searchParams.set(
        'installmentMonths',
        String(input.installmentMonths),
      );
    }
    if (
      input.installmentProvider !== undefined &&
      input.installmentProvider !== null &&
      input.installmentProvider.length > 0
    ) {
      url.searchParams.set('installmentProvider', input.installmentProvider);
    }
    return url.toString();
  }

  async createHostedPayment(
    tx: Prisma.TransactionClient,
    input: CreatePaymentInput & { idempotencyKey: string },
  ) {
    const provider = this.providerRegistry.current();
    const providerResult = await provider.createPayment(input);
    const payment = await tx.payment.create({
      data: {
        orderId: input.orderId,
        provider: providerResult.provider,
        method: input.paymentMethod,
        status: PaymentStatus.PENDING,
        amount: input.amount,
        currency: input.currency,
        providerPaymentId: providerResult.providerPaymentId,
      },
    });
    await tx.paymentAttempt.create({
      data: {
        paymentId: payment.id,
        providerPaymentId: providerResult.providerPaymentId,
        providerCheckoutToken: providerResult.checkoutToken,
        providerCheckoutUrl: providerResult.checkoutUrl,
        idempotencyKey: input.idempotencyKey,
        method: input.paymentMethod,
        installmentMonths: input.installmentMonths ?? null,
        amount: input.amount,
        currency: input.currency,
        status: PaymentStatus.PENDING,
      },
    });
    await tx.notificationOutbox.create({
      data: {
        topic: 'payments.checkout.created',
        referenceType: 'order',
        referenceId: input.orderId,
        payload: {
          provider: providerResult.provider,
          amount: input.amount.toFixed(2),
          currency: input.currency,
          paymentMethod: input.paymentMethod,
        },
      },
    });
    return {
      ...providerResult,
      checkoutUrl: this.buildHandoffUrl({
        attemptToken: providerResult.checkoutToken,
        orderNumber: input.orderNumber,
        paymentMethod: input.paymentMethod,
        amount: input.amount,
        ...(input.installmentMonths === undefined
          ? {}
          : { installmentMonths: input.installmentMonths }),
        ...(input.installmentProvider === undefined
          ? {}
          : { installmentProvider: input.installmentProvider }),
      }),
    };
  }

  async refundPayment(
    tx: Prisma.TransactionClient,
    input: {
      paymentId: string;
      reason: string;
      idempotencyKey: string;
      amount?: Prisma.Decimal;
    },
  ) {
    const payment = await tx.payment.findUniqueOrThrow({
      where: { id: input.paymentId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            fulfillmentStatus: true,
          },
        },
        refunds: {
          where: {
            status: RefundStatus.SUCCEEDED,
          },
          select: {
            amount: true,
          },
        },
      },
    });
    if (payment.providerPaymentId === null) {
      throw new BadRequestException('Provider payment id is missing');
    }

    const refundedAmount = payment.refunds.reduce(
      (sum, refund) => sum.add(refund.amount),
      new Prisma.Decimal(0),
    );
    const remainingAmount = payment.amount.sub(refundedAmount);
    const refundAmount = input.amount ?? remainingAmount;

    const existing = await tx.refund.findUnique({
      where: {
        paymentId_idempotencyKey: {
          paymentId: payment.id,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });
    if (existing !== null) {
      const nextPaymentStatus = payment.amount.equals(refundedAmount)
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;
      await this.syncOrderPaymentStatus(tx, {
        orderId: payment.order.id,
        orderStatus: payment.order.status,
        currentPaymentStatus: payment.order.paymentStatus,
        nextPaymentStatus,
        fulfillmentStatus: payment.order.fulfillmentStatus,
        reason: input.reason,
        eventType: 'payments.refund.replayed',
        payload: {
          orderNumber: payment.order.orderNumber,
          paymentId: payment.id,
          refundId: existing.id,
          refundAmount: existing.amount.toFixed(2),
          currency: payment.currency,
          idempotencyKey: input.idempotencyKey,
        },
      });
      return {
        paymentStatus: nextPaymentStatus,
        refundId: existing.id,
        refundAmount: existing.amount,
      };
    }

    if (
      payment.status !== PaymentStatus.PAID &&
      payment.status !== PaymentStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException('Only paid payments can be refunded');
    }
    if (refundAmount.lte(0)) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }
    if (refundAmount.greaterThan(remainingAmount)) {
      throw new BadRequestException('Refund amount exceeds captured payment');
    }

    const result = await this.providerRegistry.byCode(payment.provider).refund({
      providerPaymentId: payment.providerPaymentId,
      orderNumber: payment.order.orderNumber,
      amount: refundAmount,
      currency: payment.currency,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
    });
    const totalRefunded = refundedAmount.add(refundAmount);
    const nextPaymentStatus = totalRefunded.equals(payment.amount)
      ? PaymentStatus.REFUNDED
      : PaymentStatus.PARTIALLY_REFUNDED;

    const refund = await tx.refund.create({
      data: {
        paymentId: payment.id,
        providerRefundId: result.providerRefundId,
        idempotencyKey: input.idempotencyKey,
        amount: refundAmount,
        currency: payment.currency,
        reason: input.reason,
        status: result.refundStatus,
      },
    });
    await tx.paymentEvent.create({
      data: {
        paymentId: payment.id,
        providerEventId: result.providerEventId,
        providerPaymentId: result.providerPaymentId,
        eventType: result.eventType,
        status: nextPaymentStatus,
        amount: refundAmount,
        currency: payment.currency,
        orderNumber: payment.order.orderNumber,
        rawPayload: result.rawPayload,
      },
    });
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: nextPaymentStatus },
    });
    await this.syncOrderPaymentStatus(tx, {
      orderId: payment.order.id,
      orderStatus: payment.order.status,
      currentPaymentStatus: payment.order.paymentStatus,
      nextPaymentStatus,
      fulfillmentStatus: payment.order.fulfillmentStatus,
      reason: input.reason,
      eventType: result.eventType,
      payload: {
        orderNumber: payment.order.orderNumber,
        paymentId: payment.id,
        providerPaymentId: result.providerPaymentId,
        refundId: refund.id,
        refundAmount: refundAmount.toFixed(2),
        currency: payment.currency,
        idempotencyKey: input.idempotencyKey,
      },
    });
    await tx.notificationOutbox.create({
      data: {
        topic: 'payments.refunded',
        referenceType: 'order',
        referenceId: payment.order.id,
        payload: {
          orderNumber: payment.order.orderNumber,
          paymentId: payment.id,
          refundId: refund.id,
          amount: refundAmount.toFixed(2),
          currency: payment.currency,
        },
      },
    });
    return {
      paymentStatus: nextPaymentStatus,
      refundId: refund.id,
      refundAmount,
    };
  }

  async cancelPayment(
    tx: Prisma.TransactionClient,
    input: {
      paymentId: string;
      reason: string;
    },
  ) {
    const payment = await tx.payment.findUniqueOrThrow({
      where: { id: input.paymentId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
      },
    });
    if (
      payment.status !== PaymentStatus.PENDING &&
      payment.status !== PaymentStatus.AUTHORIZED
    ) {
      throw new BadRequestException(
        'Only pending or authorized payments can be cancelled',
      );
    }
    if (payment.providerPaymentId === null) {
      throw new BadRequestException('Provider payment id is missing');
    }

    const result = await this.providerRegistry.byCode(payment.provider).cancel({
      providerPaymentId: payment.providerPaymentId,
      orderNumber: payment.order.orderNumber,
      amount: payment.amount,
      currency: payment.currency,
      reason: input.reason,
    });
    await tx.paymentEvent.create({
      data: {
        paymentId: payment.id,
        providerEventId: result.providerEventId,
        providerPaymentId: result.providerPaymentId,
        eventType: result.eventType,
        status: PaymentStatus.CANCELLED,
        amount: result.amount,
        currency: result.currency,
        orderNumber: payment.order.orderNumber,
        rawPayload: result.rawPayload,
      },
    });
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.CANCELLED },
    });
    await tx.paymentAttempt.updateMany({
      where: {
        paymentId: payment.id,
        status: {
          in: [PaymentStatus.PENDING, PaymentStatus.AUTHORIZED],
        },
      },
      data: { status: PaymentStatus.CANCELLED },
    });
    await tx.notificationOutbox.create({
      data: {
        topic: 'payments.cancelled',
        referenceType: 'order',
        referenceId: payment.order.id,
        payload: {
          orderNumber: payment.order.orderNumber,
          paymentId: payment.id,
          amount: payment.amount.toFixed(2),
          currency: payment.currency,
        },
      },
    });
    return { paymentStatus: PaymentStatus.CANCELLED };
  }

  async completeMockPayment(
    attemptToken: string,
    scenario: MockPaymentScenario,
  ): Promise<OrderStatusSummary> {
    const attempt = await this.prisma.paymentAttempt.findUniqueOrThrow({
      where: { providerCheckoutToken: attemptToken },
      include: {
        payment: {
          include: {
            order: true,
          },
        },
      },
    });
    if (scenario === MockPaymentScenario.TIMEOUT) {
      return summaryFromOrder(attempt.payment.order, {
        method: attempt.payment.method,
        provider: attempt.payment.provider,
      });
    }
    const signed = await this.mockProvider.createSignedScenario(
      attemptToken,
      scenario,
    );
    return this.handleMockWebhook(signed.rawBody, signed.signature);
  }

  async continuePaymentAttempt(
    attemptToken: string,
    action: PaymentContinueAction,
  ): Promise<PaymentContinueResult> {
    const attempt = await this.prisma.paymentAttempt.findUnique({
      where: { providerCheckoutToken: attemptToken },
      include: {
        payment: {
          include: {
            order: {
              include: {
                reservations: {
                  where: { status: StockReservationStatus.ACTIVE },
                },
              },
            },
          },
        },
      },
    });
    if (attempt === null) {
      throw new BadRequestException('Payment attempt not found');
    }

    const orderNumber = attempt.payment.order.orderNumber;
    const statusUrl = this.statusUrl(orderNumber);

    if (
      attempt.status !== PaymentStatus.PENDING ||
      attempt.payment.status !== PaymentStatus.PENDING ||
      attempt.payment.order.status !== OrderStatus.PENDING_PAYMENT
    ) {
      return { nextUrl: statusUrl, kind: 'status' };
    }

    if (attempt.payment.provider === MOCK_PROVIDER_CODE) {
      const scenario =
        action === PaymentContinueAction.PROCEED
          ? MockPaymentScenario.SUCCESS
          : MockPaymentScenario.CANCEL;
      await this.completeMockPayment(attemptToken, scenario);
      return { nextUrl: statusUrl, kind: 'status' };
    }

    if (action === PaymentContinueAction.PROCEED) {
      return {
        nextUrl: assertSafeProviderRedirectUrl(attempt.providerCheckoutUrl),
        kind: 'provider_redirect',
      };
    }

    await this.prisma.$transaction(async (tx) => {
      try {
        await this.cancelPayment(tx, {
          paymentId: attempt.payment.id,
          reason: 'customer cancelled before provider redirect',
        });
      } catch {
        await tx.payment.update({
          where: { id: attempt.payment.id },
          data: { status: PaymentStatus.CANCELLED },
        });
        await tx.paymentAttempt.updateMany({
          where: {
            paymentId: attempt.payment.id,
            status: {
              in: [PaymentStatus.PENDING, PaymentStatus.AUTHORIZED],
            },
          },
          data: { status: PaymentStatus.CANCELLED },
        });
      }

      const current = await tx.order.findUniqueOrThrow({
        where: { id: attempt.payment.order.id },
        include: {
          reservations: {
            where: { status: StockReservationStatus.ACTIVE },
          },
        },
      });
      if (current.status !== OrderStatus.PENDING_PAYMENT) {
        return;
      }

      await this.releaseReservations(
        tx,
        current.reservations,
        StockReservationStatus.RELEASED,
      );
      await tx.order.update({
        where: { id: current.id },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.CANCELLED,
          fulfillmentStatus: FulfillmentStatus.CANCELLED,
          statusHistory: {
            create: {
              orderStatus: OrderStatus.CANCELLED,
              paymentStatus: PaymentStatus.CANCELLED,
              fulfillmentStatus: FulfillmentStatus.CANCELLED,
              reason: 'customer cancelled before provider redirect',
            },
          },
        },
      });
      await recordFulfillmentEvent(tx, current.id, {
        orderStatus: OrderStatus.CANCELLED,
        paymentStatus: PaymentStatus.CANCELLED,
        fulfillmentStatus: FulfillmentStatus.CANCELLED,
        eventType: 'payments.handoff.cancelled',
        reason: 'customer cancelled before provider redirect',
        payload: {
          orderNumber,
          provider: attempt.payment.provider,
        },
      });
    });

    return { nextUrl: statusUrl, kind: 'status' };
  }

  private statusUrl(orderNumber: string) {
    const storefrontOrigin = this.config.get('STOREFRONT_ORIGIN', {
      infer: true,
    });
    const url = new URL('/checkout/status', storefrontOrigin);
    url.searchParams.set('orderNumber', orderNumber);
    return url.toString();
  }

  async handleMockWebhook(
    rawBody: string,
    signature: string | undefined,
  ): Promise<OrderStatusSummary> {
    const verified = this.mockProvider.verifyWebhook({ rawBody, signature });
    return this.applyVerifiedEvent(verified);
  }

  async handleEpointWebhook(
    data: string,
    signature: string | undefined,
  ): Promise<OrderStatusSummary> {
    const verified = this.providerRegistry
      .byCode(EPOINT_PROVIDER_CODE)
      .verifyWebhook({
        rawBody: data,
        signature,
      });
    return this.applyVerifiedEvent(verified);
  }

  async getOrderStatus(orderNumber: string): Promise<OrderStatusSummary> {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { orderNumber },
      include: {
        payment: {
          select: {
            provider: true,
            method: true,
          },
        },
      },
    });
    return summaryFromOrder(order, order.payment);
  }

  async expirePendingPayments(now = new Date()) {
    const orders = await this.prisma.order.findMany({
      where: {
        status: {
          in: [OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED],
        },
        reservations: {
          some: {
            status: StockReservationStatus.ACTIVE,
            expiresAt: { lte: now },
          },
        },
      },
      select: { id: true },
    });
    for (const order of orders) {
      await this.prisma.$transaction(async (tx) => {
        const current = await tx.order.findUnique({
          where: { id: order.id },
          include: {
            reservations: {
              where: {
                status: StockReservationStatus.ACTIVE,
                expiresAt: { lte: now },
              },
            },
            payment: true,
          },
        });
        if (current === null || current.reservations.length === 0) {
          return;
        }
        if (current.status === OrderStatus.PENDING_PAYMENT) {
          let providerCancelled = false;
          if (
            current.payment !== null &&
            (current.payment.status === PaymentStatus.PENDING ||
              current.payment.status === PaymentStatus.AUTHORIZED) &&
            current.payment.providerPaymentId !== null
          ) {
            try {
              await this.cancelPayment(tx, {
                paymentId: current.payment.id,
                reason: 'payment reservation expired',
              });
              providerCancelled = true;
            } catch (error) {
              await tx.notificationOutbox.create({
                data: {
                  topic: 'payments.manual-review.required',
                  referenceType: 'order',
                  referenceId: current.id,
                  payload: {
                    reason: 'provider_cancel_failed_on_expiration',
                    orderNumber: current.orderNumber,
                    paymentId: current.payment.id,
                    providerPaymentId: current.payment.providerPaymentId,
                    provider: current.payment.provider,
                    error:
                      error instanceof Error ? error.message : 'unknown error',
                  },
                },
              });
            }
          }
          await this.releaseReservations(
            tx,
            current.reservations,
            StockReservationStatus.EXPIRED,
            now,
          );
          await tx.order.update({
            where: { id: current.id },
            data: {
              status: OrderStatus.CANCELLED,
              paymentStatus: PaymentStatus.CANCELLED,
              fulfillmentStatus: FulfillmentStatus.CANCELLED,
              statusHistory: {
                create: {
                  orderStatus: OrderStatus.CANCELLED,
                  paymentStatus: PaymentStatus.CANCELLED,
                  fulfillmentStatus: FulfillmentStatus.CANCELLED,
                  reason: 'payment reservation expired',
                },
              },
            },
          });
          if (current.payment !== null && !providerCancelled) {
            await tx.payment.update({
              where: { id: current.payment.id },
              data: { status: PaymentStatus.CANCELLED },
            });
            await tx.paymentAttempt.updateMany({
              where: {
                paymentId: current.payment.id,
                status: {
                  in: [PaymentStatus.PENDING, PaymentStatus.AUTHORIZED],
                },
              },
              data: { status: PaymentStatus.CANCELLED },
            });
          }
          await tx.notificationOutbox.create({
            data: {
              topic: 'payments.timeout.expired',
              referenceType: 'order',
              referenceId: current.id,
              payload: {
                orderNumber: current.orderNumber,
                releasedReservations: current.reservations.length,
              },
            },
          });
          await recordFulfillmentEvent(tx, current.id, {
            orderStatus: OrderStatus.CANCELLED,
            paymentStatus: PaymentStatus.CANCELLED,
            fulfillmentStatus: FulfillmentStatus.CANCELLED,
            eventType: 'payments.timeout.expired',
            reason: 'payment reservation expired',
            payload: {
              orderNumber: current.orderNumber,
              releasedReservations: current.reservations.length,
            },
          });
          return;
        }
        if (
          current.status !== OrderStatus.CONFIRMED ||
          current.payment !== null ||
          current.fulfillmentStatus !== FulfillmentStatus.RESERVED
        ) {
          return;
        }
        await this.releaseReservations(
          tx,
          current.reservations,
          StockReservationStatus.EXPIRED,
          now,
        );
        await tx.order.update({
          where: { id: current.id },
          data: {
            status: OrderStatus.CANCELLED,
            paymentStatus: PaymentStatus.CANCELLED,
            fulfillmentStatus: FulfillmentStatus.CANCELLED,
            statusHistory: {
              create: {
                orderStatus: OrderStatus.CANCELLED,
                paymentStatus: PaymentStatus.CANCELLED,
                fulfillmentStatus: FulfillmentStatus.CANCELLED,
                reason: 'cash reservation expired',
              },
            },
          },
        });
        await tx.notificationOutbox.create({
          data: {
            topic: 'orders.cash-reservation.expired',
            referenceType: 'order',
            referenceId: current.id,
            payload: {
              orderNumber: current.orderNumber,
              releasedReservations: current.reservations.length,
            },
          },
        });
        await recordFulfillmentEvent(tx, current.id, {
          orderStatus: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.CANCELLED,
          fulfillmentStatus: FulfillmentStatus.CANCELLED,
          eventType: 'orders.cash-reservation.expired',
          reason: 'cash reservation expired',
          payload: {
            orderNumber: current.orderNumber,
            releasedReservations: current.reservations.length,
          },
        });
      });
    }
  }

  async reconcilePendingPayments(now = new Date()) {
    const pendingPayments = await this.prisma.payment.findMany({
      where: {
        status: {
          in: [PaymentStatus.PENDING, PaymentStatus.AUTHORIZED],
        },
        order: {
          status: {
            in: [
              OrderStatus.PENDING_PAYMENT,
              OrderStatus.CONFIRMED,
              OrderStatus.PROCESSING,
            ],
          },
        },
      },
      select: {
        id: true,
        provider: true,
        providerPaymentId: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'asc' },
    });

    let reconciled = 0;
    for (const payment of pendingPayments) {
      if (payment.providerPaymentId === null) {
        continue;
      }
      const remote = await this.providerRegistry
        .byCode(payment.provider)
        .getPaymentStatus(payment.providerPaymentId);
      if (remote === null) {
        continue;
      }
      await this.applyVerifiedEvent(remote);
      await this.prisma.notificationOutbox.create({
        data: {
          topic: 'payments.reconciled',
          referenceType: 'payment',
          referenceId: payment.id,
          payload: {
            providerPaymentId: payment.providerPaymentId,
            reconciledAt: now.toISOString(),
            paymentStatus: remote.paymentStatus,
            eventType: remote.eventType,
          },
        },
      });
      reconciled += 1;
    }
    return reconciled;
  }

  private orderStatusAfterPaid(paymentMethod: PaymentMethod): OrderStatus {
    return paymentMethod === PaymentMethod.INSTALLMENT
      ? OrderStatus.UNDER_REVIEW
      : OrderStatus.CONFIRMED;
  }

  private async cartSubtotal(cartId: string) {
    const cart = await this.prisma.cart.findUniqueOrThrow({
      where: { id: cartId },
      include: {
        items: {
          include: {
            variant: {
              select: { price: true },
            },
          },
        },
      },
    });
    return cart.items.reduce<Prisma.Decimal>(
      (sum, item: { quantity: number; variant: { price: Prisma.Decimal } }) =>
        sum.add(item.variant.price.mul(item.quantity)),
      new Prisma.Decimal(0),
    );
  }

  private async applyVerifiedEvent(
    verified: VerifiedPaymentEvent,
  ): Promise<OrderStatusSummary> {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({
        where: { providerPaymentId: verified.providerPaymentId },
        include: {
          order: {
            include: {
              reservations: {
                where: { status: StockReservationStatus.ACTIVE },
              },
            },
          },
        },
      });
      try {
        await tx.paymentEvent.create({
          data: {
            paymentId: payment.id,
            providerEventId: verified.providerEventId,
            providerPaymentId: verified.providerPaymentId,
            eventType: verified.eventType,
            status: verified.paymentStatus,
            amount: verified.amount,
            currency: verified.currency,
            orderNumber: verified.orderNumber,
            rawPayload: verified.rawPayload,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          return summaryFromOrder(payment.order, payment);
        }
        throw error;
      }

      if (
        payment.order.orderNumber !== verified.orderNumber ||
        payment.currency !== verified.currency ||
        !payment.amount.equals(verified.amount)
      ) {
        await tx.notificationOutbox.create({
          data: {
            topic: 'payments.mismatch.detected',
            referenceType: 'payment',
            referenceId: payment.id,
            payload: {
              providerPaymentId: verified.providerPaymentId,
              expectedOrderNumber: payment.order.orderNumber,
              receivedOrderNumber: verified.orderNumber,
              expectedAmount: payment.amount.toFixed(2),
              receivedAmount: verified.amount.toFixed(2),
              expectedCurrency: payment.currency,
              receivedCurrency: verified.currency,
            },
          },
        });
        return summaryFromOrder(payment.order, payment);
      }

      await tx.paymentAttempt.updateMany({
        where: {
          paymentId: payment.id,
          providerPaymentId: verified.providerPaymentId,
        },
        data: { status: verified.paymentStatus },
      });

      if (!canTransition(payment.status, verified.paymentStatus)) {
        if (
          verified.paymentStatus === PaymentStatus.PAID &&
          payment.order.status === OrderStatus.CANCELLED
        ) {
          await tx.notificationOutbox.create({
            data: {
              topic: 'payments.manual-review.required',
              referenceType: 'order',
              referenceId: payment.order.id,
              payload: {
                reason: 'late_paid_after_cancellation',
                orderNumber: payment.order.orderNumber,
                providerPaymentId: verified.providerPaymentId,
                currentPaymentStatus: payment.status,
                receivedPaymentStatus: verified.paymentStatus,
                currentFulfillmentStatus: payment.order.fulfillmentStatus,
              },
            },
          });
        }
        return summaryFromOrder(payment.order, payment);
      }

      if (verified.paymentStatus === PaymentStatus.AUTHORIZED) {
        const updatedOrder = await tx.order.update({
          where: { id: payment.order.id },
          data: {
            paymentStatus: PaymentStatus.AUTHORIZED,
            statusHistory: {
              create: {
                orderStatus: payment.order.status,
                paymentStatus: PaymentStatus.AUTHORIZED,
                fulfillmentStatus: payment.order.fulfillmentStatus,
                reason: verified.eventType,
              },
            },
          },
        });
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.AUTHORIZED },
        });
        await recordFulfillmentEvent(tx, payment.order.id, {
          orderStatus: payment.order.status,
          paymentStatus: PaymentStatus.AUTHORIZED,
          fulfillmentStatus: payment.order.fulfillmentStatus,
          eventType: verified.eventType,
          reason: verified.eventType,
          payload: {
            orderNumber: payment.order.orderNumber,
            providerPaymentId: verified.providerPaymentId,
          },
        });
        return summaryFromOrder(updatedOrder, payment);
      }

      if (verified.paymentStatus === PaymentStatus.PAID) {
        const nextOrderStatus = this.orderStatusAfterPaid(payment.method);
        const updatedOrder = await tx.order.update({
          where: { id: payment.order.id },
          data: {
            status: nextOrderStatus,
            paymentStatus: PaymentStatus.PAID,
            fulfillmentStatus: FulfillmentStatus.RESERVED,
            statusHistory: {
              create: {
                orderStatus: nextOrderStatus,
                paymentStatus: PaymentStatus.PAID,
                fulfillmentStatus: FulfillmentStatus.RESERVED,
                reason: verified.eventType,
              },
            },
          },
        });
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.PAID },
        });
        await tx.notificationOutbox.create({
          data: {
            topic:
              nextOrderStatus === OrderStatus.UNDER_REVIEW
                ? 'orders.review.required'
                : 'payments.paid',
            referenceType: 'order',
            referenceId: payment.order.id,
            payload: {
              orderNumber: payment.order.orderNumber,
              providerPaymentId: verified.providerPaymentId,
              amount: verified.amount.toFixed(2),
              currency: verified.currency,
              paymentMethod: payment.method,
            },
          },
        });
        await recordFulfillmentEvent(tx, payment.order.id, {
          orderStatus: nextOrderStatus,
          paymentStatus: PaymentStatus.PAID,
          fulfillmentStatus: FulfillmentStatus.RESERVED,
          eventType: verified.eventType,
          reason: verified.eventType,
          payload: {
            orderNumber: payment.order.orderNumber,
            providerPaymentId: verified.providerPaymentId,
          },
        });
        return summaryFromOrder(updatedOrder, payment);
      }

      if (
        verified.paymentStatus === PaymentStatus.FAILED ||
        verified.paymentStatus === PaymentStatus.CANCELLED
      ) {
        await this.releaseReservations(
          tx,
          payment.order.reservations,
          StockReservationStatus.RELEASED,
        );
        const updatedOrder = await tx.order.update({
          where: { id: payment.order.id },
          data: {
            status: OrderStatus.CANCELLED,
            paymentStatus: verified.paymentStatus,
            fulfillmentStatus: FulfillmentStatus.CANCELLED,
            statusHistory: {
              create: {
                orderStatus: OrderStatus.CANCELLED,
                paymentStatus: verified.paymentStatus,
                fulfillmentStatus: FulfillmentStatus.CANCELLED,
                reason: verified.eventType,
              },
            },
          },
        });
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: verified.paymentStatus },
        });
        await tx.notificationOutbox.create({
          data: {
            topic:
              verified.paymentStatus === PaymentStatus.FAILED
                ? 'payments.failed'
                : 'payments.cancelled',
            referenceType: 'order',
            referenceId: payment.order.id,
            payload: {
              orderNumber: payment.order.orderNumber,
              providerPaymentId: verified.providerPaymentId,
            },
          },
        });
        await recordFulfillmentEvent(tx, payment.order.id, {
          orderStatus: OrderStatus.CANCELLED,
          paymentStatus: verified.paymentStatus,
          fulfillmentStatus: FulfillmentStatus.CANCELLED,
          eventType: verified.eventType,
          reason: verified.eventType,
          payload: {
            orderNumber: payment.order.orderNumber,
            providerPaymentId: verified.providerPaymentId,
          },
        });
        return summaryFromOrder(updatedOrder, payment);
      }

      return summaryFromOrder(payment.order, payment);
    });
  }

  private async releaseReservations(
    tx: Prisma.TransactionClient,
    reservations: Array<{
      id: string;
      variantId: string;
      locationId: string;
      quantity: number;
    }>,
    nextStatus: StockReservationStatus,
    releasedAt = new Date(),
  ) {
    for (const reservation of reservations) {
      const rows = await tx.$queryRaw<LockedBalance[]>`
        SELECT "id", "reserved"
        FROM "inventory_balances"
        WHERE "variant_id" = ${reservation.variantId}::uuid
          AND "location_id" = ${reservation.locationId}::uuid
        FOR UPDATE
      `;
      const balance = rows[0];
      if (balance === undefined || balance.reserved < reservation.quantity) {
        throw new BadRequestException(
          'Inventory reservation invariant violated',
        );
      }
      await tx.inventoryBalance.update({
        where: { id: balance.id },
        data: { reserved: { decrement: reservation.quantity } },
      });
      await tx.stockReservation.update({
        where: { id: reservation.id },
        data: {
          status: nextStatus,
          releasedAt,
        },
      });
    }
  }

  private async syncOrderPaymentStatus(
    tx: Prisma.TransactionClient,
    input: {
      orderId: string;
      orderStatus: OrderStatus;
      currentPaymentStatus: PaymentStatus;
      nextPaymentStatus: PaymentStatus;
      fulfillmentStatus: FulfillmentStatus;
      reason: string;
      eventType: string;
      payload: Prisma.InputJsonValue;
    },
  ) {
    if (input.currentPaymentStatus === input.nextPaymentStatus) {
      return;
    }
    await tx.order.update({
      where: { id: input.orderId },
      data: {
        paymentStatus: input.nextPaymentStatus,
        statusHistory: {
          create: {
            orderStatus: input.orderStatus,
            paymentStatus: input.nextPaymentStatus,
            fulfillmentStatus: input.fulfillmentStatus,
            reason: input.reason,
          },
        },
      },
    });
    await recordFulfillmentEvent(tx, input.orderId, {
      orderStatus: input.orderStatus,
      paymentStatus: input.nextPaymentStatus,
      fulfillmentStatus: input.fulfillmentStatus,
      eventType: input.eventType,
      reason: input.reason,
      payload: input.payload,
    });
  }
}

@ApiTags('payments')
@Controller({ path: 'payments', version: '1' })
class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('options')
  paymentOptions(@Query() query: PaymentOptionsQuery) {
    return this.payments.paymentOptions(query.cartId);
  }

  @Post('mock/attempts/:token/complete')
  completeMockPayment(
    @Param('token') token: string,
    @Body() dto: CompleteMockPaymentDto,
  ) {
    return this.payments.completeMockPayment(token, dto.scenario);
  }

  @Post('attempts/:token/continue')
  continuePaymentAttempt(
    @Param('token') token: string,
    @Body() dto: ContinuePaymentDto,
  ) {
    return this.payments.continuePaymentAttempt(token, dto.action);
  }

  @Post('webhooks/mock')
  @ApiHeader({ name: 'X-Mock-Signature', required: true })
  mockWebhook(
    @Headers('x-mock-signature') signature: string | undefined,
    @Body() body: Record<string, unknown>,
    @Req() request: Request & { rawBody?: Buffer },
  ) {
    const rawBody = request.rawBody?.toString('utf8') ?? JSON.stringify(body);
    return this.payments.handleMockWebhook(rawBody, signature);
  }

  @Post('webhooks/epoint')
  epointWebhook(@Body() body: Record<string, unknown>) {
    return this.payments.handleEpointWebhook(
      stringField(body.data, 'data'),
      typeof body.signature === 'string' ? body.signature : undefined,
    );
  }

  @Get('orders/:orderNumber/status')
  orderStatus(@Param('orderNumber') orderNumber: string) {
    return this.payments.getOrderStatus(orderNumber);
  }
}

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController],
  providers: [
    MockPaymentProvider,
    EpointPaymentProvider,
    PaymentProviderRegistry,
    PaymentsService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}

function assertSafeProviderRedirectUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new BadRequestException('Provider checkout URL is invalid');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new BadRequestException('Provider checkout URL must be http(s)');
  }
  if (parsed.username !== '' || parsed.password !== '') {
    throw new BadRequestException('Provider checkout URL must not include credentials');
  }
  return parsed.toString();
}

function canTransition(current: PaymentStatus, next: PaymentStatus) {
  if (current === next) return false;
  switch (current) {
    case PaymentStatus.PENDING:
      return (
        next === PaymentStatus.AUTHORIZED ||
        next === PaymentStatus.PAID ||
        next === PaymentStatus.FAILED ||
        next === PaymentStatus.CANCELLED
      );
    case PaymentStatus.AUTHORIZED:
      return next === PaymentStatus.PAID || next === PaymentStatus.CANCELLED;
    case PaymentStatus.PAID:
      return (
        next === PaymentStatus.PARTIALLY_REFUNDED ||
        next === PaymentStatus.REFUNDED
      );
    case PaymentStatus.PARTIALLY_REFUNDED:
      return next === PaymentStatus.REFUNDED;
    default:
      return false;
  }
}

function summaryFromOrder(
  order: Pick<
    Order,
    | 'id'
    | 'orderNumber'
    | 'status'
    | 'paymentStatus'
    | 'fulfillmentStatus'
    | 'fulfillmentType'
  >,
  payment:
    | {
        method: PaymentMethod;
        provider: string;
      }
    | {
        method: PaymentMethod;
        provider: string;
        status?: PaymentStatus;
      }
    | null,
): OrderStatusSummary {
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderStatus: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    fulfillmentType: order.fulfillmentType,
    paymentMethod: payment?.method ?? null,
    provider: payment?.provider ?? null,
    sandbox: sandboxForProvider(payment?.provider),
  };
}

function sandboxForProvider(provider: string | null | undefined) {
  if (provider === MOCK_PROVIDER_CODE) {
    return true;
  }
  return (
    provider === EPOINT_PROVIDER_CODE && process.env.NODE_ENV !== 'production'
  );
}

function paymentStatusFromEpoint(status: string): PaymentStatus | null {
  switch (status) {
    case 'authorized':
    case 'preauth':
      return PaymentStatus.AUTHORIZED;
    case 'success':
      return PaymentStatus.PAID;
    case 'error':
    case 'failed':
      return PaymentStatus.FAILED;
    case 'cancelled':
    case 'reversed':
      return PaymentStatus.CANCELLED;
    case 'new':
    case 'server_error':
      return PaymentStatus.PENDING;
    case 'returned':
      return PaymentStatus.REFUNDED;
    default:
      return null;
  }
}

function epointSignature(data: string, privateKey: string) {
  const signatureInput = `${privateKey}${data}${privateKey}`;
  return createHash('sha1').update(signatureInput).digest('base64');
}

function epointEventId(providerPaymentId: string, payload: string) {
  return `epoint_evt_${providerPaymentId}_${digestHex(payload).slice(0, 32)}`;
}

function digestHex(input: string) {
  return createHash('sha256').update(input).digest('hex');
}

function stringifyForSignature(payload: Record<string, unknown>) {
  return JSON.stringify(payload);
}

function decimalToNumber(value: Prisma.Decimal) {
  return Number(value.toFixed(2));
}

function decimalFromUnknown(value: unknown, fallback: Prisma.Decimal) {
  if (typeof value === 'number' || typeof value === 'string') {
    return new Prisma.Decimal(String(value));
  }
  return fallback;
}

function epointInstallmentConfigFromEnvironment(
  months: string | undefined,
  minimumAmount: string | undefined,
): EpointInstallmentConfig {
  return {
    months:
      months === undefined
        ? []
        : [
            ...new Set(
              months
                .split(',')
                .map((value) => Number.parseInt(value.trim(), 10)),
            ),
          ]
            .filter(
              (value) => Number.isInteger(value) && value >= 2 && value <= 24,
            )
            .sort((left, right) => left - right),
    minimumAmount:
      minimumAmount === undefined ? null : new Prisma.Decimal(minimumAmount),
  };
}

function isInstallmentEligible(
  total: Prisma.Decimal,
  minimumAmount: Prisma.Decimal | null,
) {
  return minimumAmount === null || total.greaterThanOrEqualTo(minimumAmount);
}

function epointStatusLabel(value: unknown) {
  return typeof value === 'string' && value.trim() !== '' ? value : 'unknown';
}

function stringOrFallback(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback;
}

function jsonStringField(value: Prisma.JsonValue | null, field: string) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const fieldValue = (value as Record<string, unknown>)[field];
  return typeof fieldValue === 'string' && fieldValue.trim() !== ''
    ? fieldValue
    : undefined;
}

function stringField(value: unknown, field: string) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BadRequestException(`Webhook field "${field}" is required`);
  }
  return value;
}

function paymentStatusField(value: unknown) {
  if (
    value !== PaymentStatus.PENDING &&
    value !== PaymentStatus.AUTHORIZED &&
    value !== PaymentStatus.PAID &&
    value !== PaymentStatus.FAILED &&
    value !== PaymentStatus.CANCELLED &&
    value !== PaymentStatus.PARTIALLY_REFUNDED &&
    value !== PaymentStatus.REFUNDED
  ) {
    throw new BadRequestException('Webhook paymentStatus is invalid');
  }
  return value;
}

function safeEqual(expected: string, actual: string) {
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  return left.length === right.length && timingSafeEqual(left, right);
}
