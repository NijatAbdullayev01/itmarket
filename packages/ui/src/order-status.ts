export const orderStatusLabels: Record<string, string> = {
  PENDING_PAYMENT: "Ödəniş gözlənir",
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

export function labelFor(
  map: Record<string, string>,
  value: string,
): string {
  return map[value] ?? value;
}
