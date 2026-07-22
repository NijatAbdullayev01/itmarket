export const orderStatusLabels: Record<string, string> = {
  PENDING_PAYMENT: "Ödəniş gözlənir",
  UNDER_REVIEW: "Baxılır",
  CONFIRMED: "Sifariş təsdiqlənib",
  PROCESSING: "Hazırlanır",
  READY_FOR_PICKUP: "Götürməyə hazırdır",
  READY_FOR_DELIVERY: "Təhvilə hazırdır",
  OUT_FOR_DELIVERY: "Çatdırılır",
  COMPLETED: "Tamamlanıb",
  CANCELLED: "Ləğv edildi",
};

export const paymentStatusLabels: Record<string, string> = {
  PENDING: "Ödəniş gözlənir",
  AUTHORIZED: "Ödəniş təsdiqlənib",
  PAID: "Ödəniş uğurla tamamlandı",
  FAILED: "Ödəniş uğursuz oldu",
  CANCELLED: "Ödəniş ləğv edildi",
  PARTIALLY_REFUNDED: "Qismən geri qaytarılıb",
  REFUNDED: "Tam geri qaytarılıb",
};

export const fulfillmentStatusLabels: Record<string, string> = {
  PENDING: "Gözləyir",
  RESERVED: "Stok rezerv olunub",
  READY_FOR_PICKUP: "Götürməyə hazırdır",
  READY_FOR_DELIVERY: "Təhvilə hazırdır",
  OUT_FOR_DELIVERY: "Çatdırılır",
  FULFILLED: "Təhvil verilib",
  CANCELLED: "Ləğv edildi",
};

export const fulfillmentTypeLabels: Record<string, string> = {
  DELIVERY: "Ünvana çatdırılma",
  PICKUP: "Mağazadan götürmə",
};

export function labelFor(
  map: Record<string, string>,
  value: string,
): string {
  return map[value] ?? value;
}

export function customerOrderStatusLabel(
  status: string,
  fulfillmentType?: string,
): string {
  if (status === "READY_FOR_DELIVERY" && fulfillmentType === "DELIVERY") {
    return "Təhvilə hazırdır";
  }

  if (status === "OUT_FOR_DELIVERY" && fulfillmentType === "DELIVERY") {
    return "Kuryerə təslim edilib";
  }

  return labelFor(orderStatusLabels, status);
}

const accountStatusBadgeWarning = new Set(["UNDER_REVIEW", "PENDING_PAYMENT"]);

const accountStatusBadgeSuccess = new Set([
  "CONFIRMED",
  "COMPLETED",
  "OUT_FOR_DELIVERY",
  "PAID",
  "FULFILLED",
]);

const accountStatusBadgeError = new Set(["CANCELLED", "FAILED"]);

export function accountStatusBadgeClass(status: string): string {
  if (accountStatusBadgeSuccess.has(status)) {
    return "ui-account-orders__badge ui-account-orders__badge--success";
  }
  if (accountStatusBadgeError.has(status)) {
    return "ui-account-orders__badge ui-account-orders__badge--error";
  }
  if (accountStatusBadgeWarning.has(status)) {
    return "ui-account-orders__badge ui-account-orders__badge--warning";
  }
  return "ui-account-orders__badge";
}
