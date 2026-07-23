export const ORDER_CANCEL_REASON_MIN_LENGTH = 3;
export const ORDER_CANCEL_REASON_MAX_LENGTH = 240;

export const CUSTOMER_CANCELLABLE_ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "UNDER_REVIEW",
  "CONFIRMED",
] as const;

export type CustomerCancellableOrderStatus =
  (typeof CUSTOMER_CANCELLABLE_ORDER_STATUSES)[number];

/** Legacy sentinel stored before free-text customer reasons were introduced. */
export const CUSTOMER_ORDER_CANCELLATION_REASON =
  "customer cancelled from account";

export const CUSTOMER_ORDER_CANCELLATION_ACTOR_TYPE = "CUSTOMER";
export const STAFF_ORDER_CANCELLATION_ACTOR_TYPE = "STAFF";

export const BACKOFFICE_CUSTOMER_CANCELLED_LABEL = "Imtina";
export const BACKOFFICE_STAFF_CANCELLED_LABEL = "Ləğv edildi";

export interface CancelCustomerOrderRequestContract {
  reason: string;
}

export function backofficeCancelledOrderLabel(
  cancelledByCustomer?: boolean,
): string {
  return cancelledByCustomer
    ? BACKOFFICE_CUSTOMER_CANCELLED_LABEL
    : BACKOFFICE_STAFF_CANCELLED_LABEL;
}

export function canCustomerCancelOrderStatus(
  status: string,
): status is CustomerCancellableOrderStatus {
  return (CUSTOMER_CANCELLABLE_ORDER_STATUSES as readonly string[]).includes(
    status,
  );
}

/**
 * Product policy (ADR-0006): customer cancel on a cancellable order with online
 * payment already PAID triggers automatic full refund without sales.refund.
 * Staff cancel/refund still requires sales.refund permission.
 */
export function customerCancelTriggersAutoRefund(
  paymentStatus: string,
): boolean {
  return paymentStatus === "PAID";
}

export function orderCancelledByCustomer(
  status: string,
  cancellation?: {
    reason?: string | null;
    actorType?: string | null;
  },
): boolean {
  if (status !== "CANCELLED") {
    return false;
  }

  if (
    cancellation?.actorType === CUSTOMER_ORDER_CANCELLATION_ACTOR_TYPE
  ) {
    return true;
  }

  return cancellation?.reason === CUSTOMER_ORDER_CANCELLATION_REASON;
}
