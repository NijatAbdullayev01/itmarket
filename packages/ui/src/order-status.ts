export const orderStatusLabels: Record<string, string> = {
  PENDING_PAYMENT: "Ödəniş gözlənir",
  UNDER_REVIEW: "Baxılır",
  CONFIRMED: "Sifariş təsdiqlənib",
  PROCESSING: "Hazırlanır",
  READY_FOR_PICKUP: "Götürməyə hazırdır",
  OUT_FOR_DELIVERY: "Çatdırılır",
  COMPLETED: "Tamamlanıb",
  CANCELLED: "Ləğv edilib",
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
  OUT_FOR_DELIVERY: "Çatdırılır",
  FULFILLED: "Təhvil verilib",
  CANCELLED: "Ləğv edilib",
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

const accountStatusBadgeWarning = new Set(["UNDER_REVIEW", "PENDING_PAYMENT"]);

const accountStatusBadgeSuccess = new Set([
  "CONFIRMED",
  "COMPLETED",
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
