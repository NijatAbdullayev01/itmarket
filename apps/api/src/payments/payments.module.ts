import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Injectable,
  Module,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import {
  createHmac,
  randomUUID,
  timingSafeEqual,
  type BinaryLike,
} from 'node:crypto';
import type { Request } from 'express';
import {
  FulfillmentStatus,
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

const MOCK_PROVIDER_CODE = 'mock';
const MOCK_INSTALLMENT_MINIMUM = new Prisma.Decimal('150.00');
const MOCK_INSTALLMENT_MONTHS = [3, 6, 12] as const;

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
  paymentMethod: PaymentMethod | null;
  provider: string | null;
  sandbox: boolean;
};

type CreatePaymentInput = {
  orderId: string;
  orderNumber: string;
  amount: Prisma.Decimal;
  currency: string;
  paymentMethod: PaymentMethod;
  installmentMonths?: number;
};

type CreatePaymentResult = {
  provider: string;
  providerPaymentId: string;
  checkoutToken: string;
  checkoutUrl: string;
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

export enum MockPaymentScenario {
  SUCCESS = 'success',
  FAILURE = 'failure',
  CANCEL = 'cancel',
  TIMEOUT = 'timeout',
}

class PaymentOptionsQuery {
  @IsOptional()
  @IsUUID()
  cartId?: string;
}

class CompleteMockPaymentDto {
  @IsEnum(MockPaymentScenario)
  scenario!: MockPaymentScenario;
}

@Injectable()
export class MockPaymentProvider {
  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly prisma: PrismaService,
  ) {}

  capabilities(total: Prisma.Decimal) {
    const installmentEligible = total.greaterThanOrEqualTo(
      MOCK_INSTALLMENT_MINIMUM,
    );
    return {
      provider: MOCK_PROVIDER_CODE,
      sandbox: true,
      methods: [
        {
          method: PaymentMethod.CARD,
          label: 'Adi kart',
          installmentMonths: [] as number[],
        },
        {
          method: PaymentMethod.INSTALLMENT,
          label: 'Taksit',
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
    const storefrontOrigin = this.config.get('STOREFRONT_ORIGIN', {
      infer: true,
    });
    const url = new URL('/checkout/mock-provider', storefrontOrigin);
    url.searchParams.set('attemptToken', checkoutToken);
    url.searchParams.set('orderNumber', input.orderNumber);
    url.searchParams.set('paymentMethod', input.paymentMethod);
    if (input.installmentMonths !== undefined) {
      url.searchParams.set(
        'installmentMonths',
        String(input.installmentMonths),
      );
    }
    url.searchParams.set('amount', input.amount.toFixed(2));
    return Promise.resolve({
      provider: MOCK_PROVIDER_CODE,
      providerPaymentId,
      checkoutToken,
      checkoutUrl: url.toString(),
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
    const payload = {
      eventId: `mock_evt_${randomUUID()}`,
      eventType,
      providerPaymentId: attempt.providerPaymentId,
      orderNumber: attempt.payment.order.orderNumber,
      paymentStatus,
      amount: attempt.amount.toFixed(2),
      currency: attempt.currency,
      occurredAt: new Date().toISOString(),
    };
    const rawBody = JSON.stringify(payload);
    return {
      rawBody,
      signature: this.sign(rawBody),
    };
  }

  verifyWebhook(
    rawBody: string,
    signature: string | undefined,
  ): VerifiedPaymentEvent {
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
    return {
      provider: MOCK_PROVIDER_CODE,
      providerEventId,
      providerPaymentId,
      orderNumber,
      paymentStatus,
      eventType,
      amount,
      currency,
      rawPayload: payload as Prisma.InputJsonValue,
    };
  }

  private sign(rawBody: BinaryLike) {
    return createHmac('sha256', this.config.get('APP_SECRET', { infer: true }))
      .update(rawBody)
      .digest('hex');
  }
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Environment, true>,
    private readonly mockProvider: MockPaymentProvider,
  ) {}

  async paymentOptions(cartId?: string) {
    const total =
      cartId === undefined
        ? new Prisma.Decimal(0)
        : await this.cartSubtotal(cartId);
    const configuredProvider = this.config
      .get('PAYMENT_PROVIDER', { infer: true })
      .toLowerCase();
    if (configuredProvider !== MOCK_PROVIDER_CODE) {
      throw new BadRequestException(
        `Unsupported payment provider "${configuredProvider}"`,
      );
    }
    return this.mockProvider.capabilities(total);
  }

  async createHostedPayment(
    tx: Prisma.TransactionClient,
    input: CreatePaymentInput & { idempotencyKey: string },
  ) {
    const providerResult = await this.mockProvider.createPayment(input);
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
    return providerResult;
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
    if (payment.provider !== MOCK_PROVIDER_CODE) {
      throw new BadRequestException(
        `Unsupported payment provider "${payment.provider}"`,
      );
    }
    if (
      payment.status !== PaymentStatus.PAID &&
      payment.status !== PaymentStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException('Only paid payments can be refunded');
    }
    if (payment.providerPaymentId === null) {
      throw new BadRequestException('Provider payment id is missing');
    }

    const refundedAmount = payment.refunds.reduce(
      (sum, refund) => sum.add(refund.amount),
      new Prisma.Decimal(0),
    );
    const remainingAmount = payment.amount.sub(refundedAmount);
    const refundAmount = input.amount ?? remainingAmount;
    if (refundAmount.lte(0)) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }
    if (refundAmount.greaterThan(remainingAmount)) {
      throw new BadRequestException('Refund amount exceeds captured payment');
    }

    const existing = await tx.refund.findUnique({
      where: {
        paymentId_idempotencyKey: {
          paymentId: payment.id,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });
    if (existing !== null) {
      return {
        paymentStatus: payment.amount.equals(refundedAmount)
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIALLY_REFUNDED,
        refundId: existing.id,
        refundAmount: existing.amount,
      };
    }

    const result = await this.mockProvider.refund({
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
    if (payment.provider !== MOCK_PROVIDER_CODE) {
      throw new BadRequestException(
        `Unsupported payment provider "${payment.provider}"`,
      );
    }
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

    const result = await this.mockProvider.cancel({
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

  async handleMockWebhook(
    rawBody: string,
    signature: string | undefined,
  ): Promise<OrderStatusSummary> {
    const verified = this.mockProvider.verifyWebhook(rawBody, signature);
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
        status: OrderStatus.PENDING_PAYMENT,
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
        if (
          current === null ||
          current.status !== OrderStatus.PENDING_PAYMENT ||
          current.reservations.length === 0
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
                reason: 'payment reservation expired',
              },
            },
          },
        });
        if (current.payment !== null) {
          await tx.payment.update({
            where: { id: current.payment.id },
            data: { status: PaymentStatus.CANCELLED },
          });
          await tx.paymentAttempt.updateMany({
            where: {
              paymentId: current.payment.id,
              status: PaymentStatus.PENDING,
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
      });
    }
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
    return cart.items.reduce(
      (sum, item) => sum.add(item.variant.price.mul(item.quantity)),
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
        return summaryFromOrder(updatedOrder, payment);
      }

      if (verified.paymentStatus === PaymentStatus.PAID) {
        const updatedOrder = await tx.order.update({
          where: { id: payment.order.id },
          data: {
            status: OrderStatus.CONFIRMED,
            paymentStatus: PaymentStatus.PAID,
            fulfillmentStatus: FulfillmentStatus.RESERVED,
            statusHistory: {
              create: {
                orderStatus: OrderStatus.CONFIRMED,
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
            topic: 'payments.paid',
            referenceType: 'order',
            referenceId: payment.order.id,
            payload: {
              orderNumber: payment.order.orderNumber,
              providerPaymentId: verified.providerPaymentId,
              amount: verified.amount.toFixed(2),
              currency: verified.currency,
            },
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

  @Get('orders/:orderNumber/status')
  orderStatus(@Param('orderNumber') orderNumber: string) {
    return this.payments.getOrderStatus(orderNumber);
  }
}

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController],
  providers: [MockPaymentProvider, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

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
    'id' | 'orderNumber' | 'status' | 'paymentStatus' | 'fulfillmentStatus'
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
    paymentMethod: payment?.method ?? null,
    provider: payment?.provider ?? null,
    sandbox: payment?.provider === MOCK_PROVIDER_CODE,
  };
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
