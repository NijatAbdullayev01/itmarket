import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Headers,
  Injectable,
  Module,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  IsUUID,
} from 'class-validator';
import {
  AuthModule,
  CurrentStaff,
  Permission,
  PermissionsGuard,
  RequirePermissions,
  type StaffPrincipal,
  StaffAuthGuard,
} from '../auth/auth.module';
import {
  FulfillmentStatus,
  FulfillmentType,
  OrderStatus,
  PaymentStatus,
  Prisma,
  StockReservationStatus,
} from '../generated/prisma/client';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { recordFulfillmentEvent } from './fulfillment-events';
import { PaymentsModule, PaymentsService } from '../payments/payments.module';

type LockedBalance = {
  id: string;
  on_hand: number;
  reserved: number;
};

export enum OrderTransitionAction {
  CONFIRM = 'CONFIRM',
  START_PROCESSING = 'START_PROCESSING',
  MARK_READY_FOR_PICKUP = 'MARK_READY_FOR_PICKUP',
  MARK_OUT_FOR_DELIVERY = 'MARK_OUT_FOR_DELIVERY',
  COMPLETE = 'COMPLETE',
  CANCEL = 'CANCEL',
}

class OrdersListQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @IsOptional()
  @IsUUID()
  cursor?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsEnum(FulfillmentType)
  fulfillmentType?: FulfillmentType;
}

class TransitionOrderDto {
  @IsEnum(OrderTransitionAction)
  action!: OrderTransitionAction;

  @IsString()
  @MinLength(3)
  @MaxLength(240)
  reason!: string;
}

class RefundOrderDto {
  @IsString()
  @MinLength(3)
  @MaxLength(240)
  reason!: string;

  @IsOptional()
  @Matches(/^\d+(?:\.\d{1,2})?$/)
  amount?: string;
}

type OrderListRow = Prisma.OrderGetPayload<{
  include: {
    address: {
      select: {
        recipientName: true;
      };
    };
    items: {
      select: {
        id: true;
      };
    };
  };
}>;

type OrderDetails = Prisma.OrderGetPayload<{
  include: {
    address: true;
    deliveryZone: {
      select: {
        id: true;
        code: true;
        name: true;
      };
    };
    pickupLocation: {
      select: {
        id: true;
        code: true;
        name: true;
      };
    };
    items: {
      orderBy: {
        createdAt: 'asc';
      };
    };
    reservations: {
      include: {
        location: {
          select: {
            id: true;
            code: true;
            name: true;
          };
        };
      };
      orderBy: {
        createdAt: 'asc';
      };
    };
    payment: {
      select: {
        id: true;
        provider: true;
        method: true;
        status: true;
        amount: true;
        currency: true;
        providerPaymentId: true;
      };
    };
    statusHistory: {
      orderBy: {
        createdAt: 'asc';
      };
    };
    fulfillmentEvents: {
      orderBy: {
        createdAt: 'asc';
      };
    };
  };
}>;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  async list(query: OrdersListQuery) {
    const rows = await this.prisma.order.findMany({
      take: query.limit + 1,
      ...(query.cursor === undefined
        ? {}
        : {
            cursor: { id: query.cursor },
            skip: 1,
          }),
      where: {
        ...(query.status === undefined ? {} : { status: query.status }),
        ...(query.paymentStatus === undefined
          ? {}
          : { paymentStatus: query.paymentStatus }),
        ...(query.fulfillmentType === undefined
          ? {}
          : { fulfillmentType: query.fulfillmentType }),
      },
      include: {
        address: {
          select: {
            recipientName: true,
          },
        },
        items: {
          select: {
            id: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const items = rows
      .slice(0, query.limit)
      .map((order) => this.mapListOrder(order));

    return {
      items,
      nextCursor: rows.length > query.limit ? (items.at(-1)?.id ?? null) : null,
    };
  }

  async get(id: string) {
    return this.mapOrder(await this.loadOrder(this.prisma, id));
  }

  async transition(id: string, dto: TransitionOrderDto, actor: StaffPrincipal) {
    return this.prisma.$transaction(
      async (tx) => {
        const order = await this.loadOrder(tx, id);
        switch (dto.action) {
          case OrderTransitionAction.CONFIRM:
            return this.confirmOrder(tx, order, dto.reason, actor);
          case OrderTransitionAction.START_PROCESSING:
            return this.startProcessing(tx, order, dto.reason, actor);
          case OrderTransitionAction.MARK_READY_FOR_PICKUP:
            return this.markReadyForPickup(tx, order, dto.reason, actor);
          case OrderTransitionAction.MARK_OUT_FOR_DELIVERY:
            return this.markOutForDelivery(tx, order, dto.reason, actor);
          case OrderTransitionAction.COMPLETE:
            return this.completeOrder(tx, order, dto.reason, actor);
          case OrderTransitionAction.CANCEL:
            return this.cancelOrder(tx, order, dto.reason, actor);
          default:
            throw new BadRequestException('Unsupported transition action');
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async cancelByCustomer(customerId: string, orderId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const order = await this.loadOrder(tx, orderId);
        if (order.customerId !== customerId) {
          throw new NotFoundException('Sifariş tapılmadı');
        }
        if (
          order.status !== OrderStatus.PENDING_PAYMENT &&
          order.status !== OrderStatus.UNDER_REVIEW &&
          order.status !== OrderStatus.CONFIRMED
        ) {
          throw new ConflictException('Bu sifariş artıq ləğv edilə bilməz');
        }
        if (
          order.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED ||
          order.paymentStatus === PaymentStatus.REFUNDED
        ) {
          throw new ConflictException('Bu sifariş artıq ləğv edilə bilməz');
        }

        const updated = await this.applyOrderCancellation(
          tx,
          order,
          'customer cancelled from account',
          {
            actorType: 'customer',
            actorId: customerId,
            actorStaffId: null,
            allowPaidRefund: true,
          },
        );
        return this.mapListOrder(
          await this.loadOrderListRow(tx, updated.id),
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async refund(
    id: string,
    dto: RefundOrderDto,
    idempotencyKey: string | undefined,
    actor: StaffPrincipal,
  ) {
    if (idempotencyKey === undefined || idempotencyKey.trim().length < 8) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    if (!actor.permissions.includes(Permission.REFUND)) {
      throw new ForbiddenException('Refund permission is required');
    }
    return this.prisma.$transaction(
      async (tx) => {
        const order = await this.loadOrder(tx, id);
        if (order.payment === null) {
          throw new BadRequestException(
            'Order has no online payment to refund',
          );
        }
        if (
          order.paymentStatus !== PaymentStatus.PAID &&
          order.paymentStatus !== PaymentStatus.PARTIALLY_REFUNDED
        ) {
          throw new ConflictException(
            'Only paid or partially refunded orders can be refunded',
          );
        }
        const refund = await this.payments.refundPayment(tx, {
          paymentId: order.payment.id,
          reason: dto.reason,
          idempotencyKey,
          ...(dto.amount === undefined
            ? {}
            : { amount: new Prisma.Decimal(dto.amount) }),
        });
        await this.recordAudit(tx, actor, 'order.refunded', order.id, {
          orderNumber: order.orderNumber,
          reason: dto.reason,
          refundId: refund.refundId,
          refundAmount: refund.refundAmount.toFixed(2),
          paymentStatus: refund.paymentStatus,
          idempotencyKey,
        });
        await tx.notificationOutbox.create({
          data: {
            topic: 'orders.refunded',
            referenceType: 'order',
            referenceId: order.id,
            payload: {
              orderNumber: order.orderNumber,
              actorId: actor.id,
              reason: dto.reason,
              refundId: refund.refundId,
              refundAmount: refund.refundAmount.toFixed(2),
              paymentStatus: refund.paymentStatus,
              idempotencyKey,
            },
          },
        });
        return this.mapOrder(await this.loadOrder(tx, order.id));
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async confirmOrder(
    tx: Prisma.TransactionClient,
    order: OrderDetails,
    reason: string,
    actor: StaffPrincipal,
  ) {
    if (order.status !== OrderStatus.UNDER_REVIEW) {
      throw new ConflictException(
        'Only orders under review can be confirmed',
      );
    }
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CONFIRMED,
        statusHistory: {
          create: {
            orderStatus: OrderStatus.CONFIRMED,
            paymentStatus: order.paymentStatus,
            fulfillmentStatus: order.fulfillmentStatus,
            reason,
          },
        },
      },
    });
    await this.recordAudit(tx, actor, 'order.confirmed', updated.id, {
      orderNumber: updated.orderNumber,
      reason,
    });
    await tx.notificationOutbox.create({
      data: {
        topic: 'orders.confirmed',
        referenceType: 'order',
        referenceId: updated.id,
        payload: {
          orderNumber: updated.orderNumber,
          actorId: actor.id,
          reason,
        },
      },
    });
    await recordFulfillmentEvent(tx, updated.id, {
      orderStatus: OrderStatus.CONFIRMED,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      eventType: 'orders.confirmed',
      reason,
      actorStaffId: actor.id,
      payload: {
        orderNumber: updated.orderNumber,
      },
    });
    return this.mapOrder(await this.loadOrder(tx, updated.id));
  }

  private async startProcessing(
    tx: Prisma.TransactionClient,
    order: OrderDetails,
    reason: string,
    actor: StaffPrincipal,
  ) {
    if (order.status !== OrderStatus.CONFIRMED) {
      throw new ConflictException('Only CONFIRMED orders can enter processing');
    }
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PROCESSING,
        statusHistory: {
          create: {
            orderStatus: OrderStatus.PROCESSING,
            paymentStatus: order.paymentStatus,
            fulfillmentStatus: order.fulfillmentStatus,
            reason,
          },
        },
      },
    });
    await this.recordAudit(tx, actor, 'order.processing-started', updated.id, {
      orderNumber: updated.orderNumber,
      reason,
    });
    await tx.notificationOutbox.create({
      data: {
        topic: 'orders.processing.started',
        referenceType: 'order',
        referenceId: updated.id,
        payload: {
          orderNumber: updated.orderNumber,
          actorId: actor.id,
          reason,
        },
      },
    });
    await recordFulfillmentEvent(tx, updated.id, {
      orderStatus: OrderStatus.PROCESSING,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      eventType: 'orders.processing.started',
      reason,
      actorStaffId: actor.id,
      payload: {
        orderNumber: updated.orderNumber,
      },
    });
    return this.mapOrder(await this.loadOrder(tx, updated.id));
  }

  private async markReadyForPickup(
    tx: Prisma.TransactionClient,
    order: OrderDetails,
    reason: string,
    actor: StaffPrincipal,
  ) {
    if (order.fulfillmentType !== FulfillmentType.PICKUP) {
      throw new ConflictException(
        'Only pickup orders can become READY_FOR_PICKUP',
      );
    }
    if (order.status !== OrderStatus.PROCESSING) {
      throw new ConflictException('Pickup orders must be PROCESSING first');
    }
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.READY_FOR_PICKUP,
        fulfillmentStatus: FulfillmentStatus.READY_FOR_PICKUP,
        statusHistory: {
          create: {
            orderStatus: OrderStatus.READY_FOR_PICKUP,
            paymentStatus: order.paymentStatus,
            fulfillmentStatus: FulfillmentStatus.READY_FOR_PICKUP,
            reason,
          },
        },
      },
    });
    await this.recordAudit(tx, actor, 'order.ready-for-pickup', updated.id, {
      orderNumber: updated.orderNumber,
      reason,
    });
    await tx.notificationOutbox.create({
      data: {
        topic: 'orders.pickup.ready',
        referenceType: 'order',
        referenceId: updated.id,
        payload: {
          orderNumber: updated.orderNumber,
          actorId: actor.id,
          reason,
        },
      },
    });
    await recordFulfillmentEvent(tx, updated.id, {
      orderStatus: OrderStatus.READY_FOR_PICKUP,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: FulfillmentStatus.READY_FOR_PICKUP,
      eventType: 'orders.pickup.ready',
      reason,
      actorStaffId: actor.id,
      payload: {
        orderNumber: updated.orderNumber,
      },
    });
    return this.mapOrder(await this.loadOrder(tx, updated.id));
  }

  private async markOutForDelivery(
    tx: Prisma.TransactionClient,
    order: OrderDetails,
    reason: string,
    actor: StaffPrincipal,
  ) {
    if (order.fulfillmentType !== FulfillmentType.DELIVERY) {
      throw new ConflictException(
        'Only delivery orders can become OUT_FOR_DELIVERY',
      );
    }
    if (order.status !== OrderStatus.PROCESSING) {
      throw new ConflictException('Delivery orders must be PROCESSING first');
    }
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.OUT_FOR_DELIVERY,
        fulfillmentStatus: FulfillmentStatus.OUT_FOR_DELIVERY,
        statusHistory: {
          create: {
            orderStatus: OrderStatus.OUT_FOR_DELIVERY,
            paymentStatus: order.paymentStatus,
            fulfillmentStatus: FulfillmentStatus.OUT_FOR_DELIVERY,
            reason,
          },
        },
      },
    });
    await this.recordAudit(tx, actor, 'order.out-for-delivery', updated.id, {
      orderNumber: updated.orderNumber,
      reason,
    });
    await tx.notificationOutbox.create({
      data: {
        topic: 'orders.delivery.dispatched',
        referenceType: 'order',
        referenceId: updated.id,
        payload: {
          orderNumber: updated.orderNumber,
          actorId: actor.id,
          reason,
        },
      },
    });
    await recordFulfillmentEvent(tx, updated.id, {
      orderStatus: OrderStatus.OUT_FOR_DELIVERY,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: FulfillmentStatus.OUT_FOR_DELIVERY,
      eventType: 'orders.delivery.dispatched',
      reason,
      actorStaffId: actor.id,
      payload: {
        orderNumber: updated.orderNumber,
      },
    });
    return this.mapOrder(await this.loadOrder(tx, updated.id));
  }

  private async completeOrder(
    tx: Prisma.TransactionClient,
    order: OrderDetails,
    reason: string,
    actor: StaffPrincipal,
  ) {
    const isPickupReady =
      order.fulfillmentType === FulfillmentType.PICKUP &&
      order.status === OrderStatus.READY_FOR_PICKUP;
    const isDeliveryComplete =
      order.fulfillmentType === FulfillmentType.DELIVERY &&
      order.status === OrderStatus.OUT_FOR_DELIVERY;
    if (!isPickupReady && !isDeliveryComplete) {
      throw new ConflictException(
        'Order can only complete from READY_FOR_PICKUP or OUT_FOR_DELIVERY',
      );
    }
    if (order.paymentStatus === PaymentStatus.AUTHORIZED) {
      throw new ConflictException(
        'Authorized payments must be captured or cancelled before completion',
      );
    }
    await this.consumeReservations(tx, order, actor);
    const nextPaymentStatus =
      order.paymentStatus === PaymentStatus.PENDING
        ? PaymentStatus.PAID
        : order.paymentStatus;
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.COMPLETED,
        paymentStatus: nextPaymentStatus,
        fulfillmentStatus: FulfillmentStatus.FULFILLED,
        statusHistory: {
          create: {
            orderStatus: OrderStatus.COMPLETED,
            paymentStatus: nextPaymentStatus,
            fulfillmentStatus: FulfillmentStatus.FULFILLED,
            reason,
          },
        },
      },
    });
    if (
      order.payment !== null &&
      order.payment.status === PaymentStatus.PENDING
    ) {
      await tx.payment.update({
        where: { id: order.payment.id },
        data: { status: PaymentStatus.PAID },
      });
      await tx.paymentAttempt.updateMany({
        where: {
          paymentId: order.payment.id,
          status: PaymentStatus.PENDING,
        },
        data: { status: PaymentStatus.PAID },
      });
    }
    await this.recordAudit(tx, actor, 'order.completed', updated.id, {
      orderNumber: updated.orderNumber,
      reason,
    });
    await tx.notificationOutbox.create({
      data: {
        topic: 'orders.completed',
        referenceType: 'order',
        referenceId: updated.id,
        payload: {
          orderNumber: updated.orderNumber,
          actorId: actor.id,
          reason,
          paymentStatus: nextPaymentStatus,
        },
      },
    });
    await recordFulfillmentEvent(tx, updated.id, {
      orderStatus: OrderStatus.COMPLETED,
      paymentStatus: nextPaymentStatus,
      fulfillmentStatus: FulfillmentStatus.FULFILLED,
      eventType: 'orders.completed',
      reason,
      actorStaffId: actor.id,
      payload: {
        orderNumber: updated.orderNumber,
      },
    });
    return this.mapOrder(await this.loadOrder(tx, updated.id));
  }

  private async cancelOrder(
    tx: Prisma.TransactionClient,
    order: OrderDetails,
    reason: string,
    actor: StaffPrincipal,
  ) {
    if (
      order.status !== OrderStatus.UNDER_REVIEW &&
      order.status !== OrderStatus.CONFIRMED &&
      order.status !== OrderStatus.PROCESSING &&
      order.status !== OrderStatus.READY_FOR_PICKUP &&
      order.status !== OrderStatus.OUT_FOR_DELIVERY
    ) {
      throw new ConflictException(
        'Only active fulfillment orders can be cancelled',
      );
    }
    if (
      order.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED ||
      order.paymentStatus === PaymentStatus.REFUNDED
    ) {
      throw new ConflictException(
        'Partially or fully refunded orders cannot be cancelled again',
      );
    }
    if (
      order.paymentStatus === PaymentStatus.PAID &&
      !actor.permissions.includes(Permission.REFUND)
    ) {
      throw new ForbiddenException(
        'Refund permission is required to cancel paid orders',
      );
    }

    await this.applyOrderCancellation(tx, order, reason, {
      actorType: 'staff',
      actorId: actor.id,
      actorStaffId: actor.id,
      allowPaidRefund: actor.permissions.includes(Permission.REFUND),
    });
    return this.mapOrder(await this.loadOrder(tx, order.id));
  }

  private async applyOrderCancellation(
    tx: Prisma.TransactionClient,
    order: OrderDetails,
    reason: string,
    context: {
      actorType: 'staff' | 'customer';
      actorId: string;
      actorStaffId: string | null;
      allowPaidRefund: boolean;
    },
  ) {
    let nextPaymentStatus: PaymentStatus = PaymentStatus.CANCELLED;
    let refundDetails:
      | {
          refundId: string;
          refundAmount: Prisma.Decimal;
        }
      | undefined;
    if (order.payment !== null) {
      if (order.paymentStatus === PaymentStatus.PAID) {
        if (!context.allowPaidRefund) {
          throw new ForbiddenException(
            'Refund permission is required to cancel paid orders',
          );
        }
        const refund = await this.payments.refundPayment(tx, {
          paymentId: order.payment.id,
          reason,
          idempotencyKey: `order-cancel:${order.id}`,
        });
        nextPaymentStatus = refund.paymentStatus;
        refundDetails = {
          refundId: refund.refundId,
          refundAmount: refund.refundAmount,
        };
      } else if (
        order.paymentStatus === PaymentStatus.PENDING ||
        order.paymentStatus === PaymentStatus.AUTHORIZED
      ) {
        await this.payments.cancelPayment(tx, {
          paymentId: order.payment.id,
          reason,
        });
        nextPaymentStatus = PaymentStatus.CANCELLED;
      }
    }
    await this.releaseReservations(tx, order.reservations);
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CANCELLED,
        paymentStatus: nextPaymentStatus,
        fulfillmentStatus: FulfillmentStatus.CANCELLED,
        statusHistory: {
          create: {
            orderStatus: OrderStatus.CANCELLED,
            paymentStatus: nextPaymentStatus,
            fulfillmentStatus: FulfillmentStatus.CANCELLED,
            reason,
          },
        },
      },
    });
    await tx.auditLog.create({
      data: {
        actorType: context.actorType,
        actorId: context.actorId,
        action: 'order.cancelled',
        entityType: 'order',
        entityId: updated.id,
        after: {
          orderNumber: updated.orderNumber,
          reason,
          paymentStatus: nextPaymentStatus,
          refundId: refundDetails?.refundId ?? null,
          refundAmount: refundDetails?.refundAmount.toFixed(2) ?? null,
        },
      },
    });
    await tx.notificationOutbox.create({
      data: {
        topic: 'orders.cancelled',
        referenceType: 'order',
        referenceId: updated.id,
        payload: {
          orderNumber: updated.orderNumber,
          actorId: context.actorId,
          reason,
          paymentStatus: nextPaymentStatus,
          refundId: refundDetails?.refundId ?? null,
          refundAmount: refundDetails?.refundAmount.toFixed(2) ?? null,
        },
      },
    });
    await recordFulfillmentEvent(tx, updated.id, {
      orderStatus: OrderStatus.CANCELLED,
      paymentStatus: nextPaymentStatus,
      fulfillmentStatus: FulfillmentStatus.CANCELLED,
      eventType: 'orders.cancelled',
      reason,
      ...(context.actorStaffId === null
        ? {}
        : { actorStaffId: context.actorStaffId }),
      payload: {
        orderNumber: updated.orderNumber,
        refundId: refundDetails?.refundId ?? null,
        refundAmount: refundDetails?.refundAmount.toFixed(2) ?? null,
      },
    });
    return updated;
  }

  private async consumeReservations(
    tx: Prisma.TransactionClient,
    order: OrderDetails,
    actor: StaffPrincipal,
  ) {
    for (const reservation of order.reservations) {
      if (reservation.status !== StockReservationStatus.ACTIVE) {
        continue;
      }
      const rows = await tx.$queryRaw<LockedBalance[]>`
        SELECT "id", "on_hand", "reserved"
        FROM "inventory_balances"
        WHERE "variant_id" = ${reservation.variantId}::uuid
          AND "location_id" = ${reservation.locationId}::uuid
        FOR UPDATE
      `;
      const balance = rows[0];
      if (
        balance === undefined ||
        balance.reserved < reservation.quantity ||
        balance.on_hand < reservation.quantity
      ) {
        throw new ConflictException('Inventory reservation invariant violated');
      }
      await tx.inventoryBalance.update({
        where: { id: balance.id },
        data: {
          onHand: { decrement: reservation.quantity },
          reserved: { decrement: reservation.quantity },
        },
      });
      await tx.stockReservation.update({
        where: { id: reservation.id },
        data: {
          status: StockReservationStatus.CONSUMED,
          releasedAt: new Date(),
        },
      });
      await tx.inventoryMovement.create({
        data: {
          variantId: reservation.variantId,
          locationId: reservation.locationId,
          type: 'SALE',
          quantityDelta: -reservation.quantity,
          sourceType: 'order-fulfillment',
          sourceDocumentId: order.id,
          reason: `Order ${order.orderNumber} completed`,
          actorStaffId: actor.id,
        },
      });
    }
  }

  private async releaseReservations(
    tx: Prisma.TransactionClient,
    reservations: OrderDetails['reservations'],
  ) {
    for (const reservation of reservations) {
      if (reservation.status !== StockReservationStatus.ACTIVE) {
        continue;
      }
      const rows = await tx.$queryRaw<LockedBalance[]>`
        SELECT "id", "reserved"
        FROM "inventory_balances"
        WHERE "variant_id" = ${reservation.variantId}::uuid
          AND "location_id" = ${reservation.locationId}::uuid
        FOR UPDATE
      `;
      const balance = rows[0];
      if (balance === undefined || balance.reserved < reservation.quantity) {
        throw new ConflictException('Inventory reservation invariant violated');
      }
      await tx.inventoryBalance.update({
        where: { id: balance.id },
        data: { reserved: { decrement: reservation.quantity } },
      });
      await tx.stockReservation.update({
        where: { id: reservation.id },
        data: {
          status: StockReservationStatus.RELEASED,
          releasedAt: new Date(),
        },
      });
    }
  }

  private async recordAudit(
    tx: Prisma.TransactionClient,
    actor: StaffPrincipal,
    action: string,
    entityId: string,
    after: Prisma.InputJsonValue,
  ) {
    await tx.auditLog.create({
      data: {
        actorType: 'staff',
        actorId: actor.id,
        action,
        entityType: 'order',
        entityId,
        after,
      },
    });
  }

  private mapListOrder(order: OrderListRow) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      fulfillmentType: order.fulfillmentType,
      recipientName: order.address?.recipientName ?? null,
      itemCount: order.items.length,
      grandTotal: order.grandTotal.toFixed(2),
      currency: order.currency as 'AZN',
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  private mapOrder(order: OrderDetails) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      fulfillmentType: order.fulfillmentType,
      customerId: order.customerId,
      guestEmail: order.guestEmail,
      guestPhone: order.guestPhone,
      subtotal: order.subtotal.toFixed(2),
      discountTotal: order.discountTotal.toFixed(2),
      deliveryFee: order.deliveryFee.toFixed(2),
      taxTotal: order.taxTotal.toFixed(2),
      grandTotal: order.grandTotal.toFixed(2),
      currency: order.currency,
      deliveryZone: order.deliveryZone,
      pickupLocation: order.pickupLocation,
      address:
        order.address === null
          ? null
          : {
              recipientName: order.address.recipientName,
              phone: order.address.phone,
              administrativeArea: order.address.administrativeArea,
              addressLine: order.address.addressLine,
              notes: order.address.notes,
            },
      payment:
        order.payment === null
          ? null
          : {
              id: order.payment.id,
              provider: order.payment.provider,
              method: order.payment.method,
              status: order.payment.status,
              amount: order.payment.amount.toFixed(2),
              currency: order.payment.currency,
              providerPaymentId: order.payment.providerPaymentId,
            },
      items: order.items.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        sku: item.sku,
        barcode: item.barcode,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        discountTotal: item.discountTotal.toFixed(2),
        taxTotal: item.taxTotal.toFixed(2),
        lineTotal: item.lineTotal.toFixed(2),
        currency: item.currency,
      })),
      reservations: order.reservations.map((reservation) => ({
        id: reservation.id,
        variantId: reservation.variantId,
        locationId: reservation.locationId,
        location: reservation.location,
        quantity: reservation.quantity,
        status: reservation.status,
        expiresAt: reservation.expiresAt.toISOString(),
        releasedAt: reservation.releasedAt?.toISOString() ?? null,
      })),
      statusHistory: order.statusHistory.map((entry) => ({
        id: entry.id,
        orderStatus: entry.orderStatus,
        paymentStatus: entry.paymentStatus,
        fulfillmentStatus: entry.fulfillmentStatus,
        reason: entry.reason,
        createdAt: entry.createdAt.toISOString(),
      })),
      fulfillmentEvents: order.fulfillmentEvents.map((event) => ({
        id: event.id,
        orderStatus: event.orderStatus,
        paymentStatus: event.paymentStatus,
        fulfillmentStatus: event.fulfillmentStatus,
        eventType: event.eventType,
        reason: event.reason,
        actorStaffId: event.actorStaffId,
        payload: event.payload,
        createdAt: event.createdAt.toISOString(),
      })),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  private loadOrderListRow(
    tx: Prisma.TransactionClient | PrismaService,
    id: string,
  ): Promise<OrderListRow> {
    return tx.order.findUniqueOrThrow({
      where: { id },
      include: {
        address: {
          select: {
            recipientName: true,
          },
        },
        items: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  private loadOrder(
    tx: Prisma.TransactionClient | PrismaService,
    id: string,
  ): Promise<OrderDetails> {
    return tx.order.findUniqueOrThrow({
      where: { id },
      include: {
        address: true,
        deliveryZone: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        pickupLocation: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        items: { orderBy: { createdAt: 'asc' } },
        reservations: {
          include: {
            location: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        payment: {
          select: {
            id: true,
            provider: true,
            method: true,
            status: true,
            amount: true,
            currency: true,
            providerPaymentId: true,
          },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        fulfillmentEvents: { orderBy: { createdAt: 'asc' } },
      },
    });
  }
}

@ApiTags('orders')
@ApiCookieAuth('itmarket_staff_access')
@UseGuards(StaffAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.ORDERS_READ)
@Controller({ path: 'orders', version: '1' })
class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@Query() query: OrdersListQuery) {
    return this.orders.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.get(id);
  }

  @Post(':id/transitions')
  @RequirePermissions(Permission.FULFILLMENT_WRITE)
  transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionOrderDto,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.orders.transition(id, dto, actor);
  }

  @Post(':id/refunds')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @RequirePermissions(Permission.REFUND)
  refund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RefundOrderDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentStaff() actor: StaffPrincipal,
  ) {
    return this.orders.refund(id, dto, idempotencyKey, actor);
  }
}

@Module({
  imports: [PrismaModule, AuthModule, PaymentsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
