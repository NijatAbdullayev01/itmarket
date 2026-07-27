export type StaffCreditApplicationStatus =
  | "PENDING"
  | "PROCESSING"
  | "APPROVED"
  | "REJECTED";

export interface StaffCreditApplicationSummaryContract {
  id: string;
  status: StaffCreditApplicationStatus;
  finCode: string;
  phone: string;
  email: string | null;
  quantity: number;
  amount: string;
  currency: "AZN";
  productId: string;
  productName: string;
  productSlug: string;
  variantId: string;
  variantName: string;
  variantSku: string;
  customerId: string | null;
  customerName: string | null;
  cartId: string | null;
  createdAt: string;
  updatedAt: string;
}
