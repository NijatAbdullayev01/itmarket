import {
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '../generated/prisma/client';

export type FulfillmentEventInput = {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  eventType: string;
  reason: string;
  actorStaffId?: string;
  payload?: Prisma.InputJsonValue;
};

export async function recordFulfillmentEvent(
  tx: Prisma.TransactionClient,
  orderId: string,
  input: FulfillmentEventInput,
) {
  await tx.fulfillmentEvent.create({
    data: {
      orderId,
      orderStatus: input.orderStatus,
      paymentStatus: input.paymentStatus,
      fulfillmentStatus: input.fulfillmentStatus,
      eventType: input.eventType,
      reason: input.reason,
      actorStaffId: input.actorStaffId ?? null,
      payload: input.payload ?? {},
    },
  });
}
