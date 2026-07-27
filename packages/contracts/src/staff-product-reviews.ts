export interface StaffProductReviewSummaryContract {
  id: string;
  published: boolean;
  rating: number;
  comment: string | null;
  productId: string;
  productName: string;
  productSlug: string;
  variantId: string;
  variantName: string;
  variantSku: string;
  customerId: string;
  customerName: string | null;
  orderId: string;
  orderItemId: string;
  createdAt: string;
  updatedAt: string;
}
