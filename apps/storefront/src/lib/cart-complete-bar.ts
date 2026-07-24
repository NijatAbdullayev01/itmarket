import type { ProductMedia } from "@/lib/api";

export type CartCompleteBarSummary = {
  itemCount: number;
  subtotal: string;
  items: {
    id: string;
    productName: string;
    image: ProductMedia | null;
  }[];
};
