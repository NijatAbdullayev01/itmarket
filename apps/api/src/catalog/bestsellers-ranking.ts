export const HOME_BESTSELLERS_LIMIT = 8;
export const HOME_BESTSELLERS_WINDOW_DAYS = 90;
export const HOME_WEEKLY_DEAL_MAX = 8;

export const BESTSELLER_COUNTED_ORDER_STATUSES = [
  'CONFIRMED',
  'PROCESSING',
  'READY_FOR_PICKUP',
  'READY_FOR_DELIVERY',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
] as const;

export type ProductSoldQuantity = {
  productId: string;
  soldQty: number;
};

export function mergeProductSoldQuantities(
  ...groups: readonly ProductSoldQuantity[][]
): ProductSoldQuantity[] {
  const totals = new Map<string, number>();

  for (const group of groups) {
    for (const row of group) {
      const qty = Number.isFinite(row.soldQty) ? Math.max(0, row.soldQty) : 0;
      if (qty <= 0) {
        continue;
      }
      totals.set(row.productId, (totals.get(row.productId) ?? 0) + qty);
    }
  }

  return [...totals.entries()]
    .map(([productId, soldQty]) => ({ productId, soldQty }))
    .sort(
      (left, right) =>
        right.soldQty - left.soldQty ||
        left.productId.localeCompare(right.productId),
    );
}

export function takeTopSoldProducts(
  rows: readonly ProductSoldQuantity[],
  limit = HOME_BESTSELLERS_LIMIT,
): ProductSoldQuantity[] {
  return rows.slice(0, Math.max(0, limit));
}
