export type StaffAvailabilityRequestType = "STOCK_ALERT" | "PREORDER";

export type StaffAvailabilityRequestStatus =
  | "PENDING"
  | "FULFILLED"
  | "CANCELLED";

export interface StaffAvailabilityRequestNavCountsContract {
  /** Gözləyən ön sifariş sorğularının sayı (sidebar badge). */
  pendingPreorders: number;
  /** Gözləyən stok bildirişi sorğularının sayı. */
  pendingStockAlerts: number;
}

export interface StaffAvailabilityRequestSummaryContract {
  id: string;
  type: StaffAvailabilityRequestType;
  status: StaffAvailabilityRequestStatus;
  phone: string;
  email: string | null;
  quantity: number;
  productId: string;
  productName: string;
  productSlug: string;
  variantId: string;
  variantName: string;
  variantSku: string;
  customerId: string | null;
  customerName: string | null;
  fulfilledAt: string | null;
  createdAt: string;
  updatedAt: string;
}
