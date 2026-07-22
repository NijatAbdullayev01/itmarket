import type { OrderSummaryContract } from "./index.js";

export type OrderNavBucket = "new" | "packaging" | "ready" | "all";

export interface OrderNavCountsContract {
  new: number;
  packaging: number;
  ready: number;
  all: number;
}

export const ORDER_NAV_BUCKET_LABELS: Record<
  Exclude<OrderNavBucket, "all">,
  string
> = {
  new: "Yeni",
  packaging: "Qablaşdırmada",
  ready: "Təhvilə",
};

export const ORDER_NAV_ALL_LABEL = "Hamısı";

export const ORDER_NAV_BUCKET_STATUSES: Record<
  Exclude<OrderNavBucket, "all">,
  readonly OrderSummaryContract["status"][]
> = {
  new: ["UNDER_REVIEW", "CONFIRMED"],
  packaging: ["PROCESSING"],
  ready: ["READY_FOR_PICKUP", "READY_FOR_DELIVERY"],
};

export function resolveOrderNavBucket(
  view: string | null | undefined,
): OrderNavBucket {
  if (view === "new" || view === "packaging" || view === "ready") {
    return view;
  }

  return "all";
}

export function orderMatchesNavBucket(
  status: OrderSummaryContract["status"],
  bucket: Exclude<OrderNavBucket, "all">,
): boolean {
  return ORDER_NAV_BUCKET_STATUSES[bucket].includes(status);
}
