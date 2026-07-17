"use client";

import { removeCartLine, updateCartQuantity } from "@/app/actions";
import { CartLineItem, type ProductMedia } from "@itmarket/ui";

type CartLine = {
  id: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  lineTotal: string;
  linePreviousTotal?: string | null;
  available: number;
  image: ProductMedia | null;
};

type CartLinesProps = {
  cartId: string;
  items: CartLine[];
  variant?: "default" | "summary";
};

export function CartLines({ cartId, items, variant = "default" }: CartLinesProps) {
  const isSummaryScrollable = variant === "summary" && items.length > 3;

  return (
    <div
      className={
        variant === "summary"
          ? [
              "ui-cart-lines",
              "ui-cart-lines--summary",
              isSummaryScrollable ? "ui-cart-lines--summary-scroll" : "",
            ]
              .filter(Boolean)
              .join(" ")
          : "ui-cart-lines"
      }
    >
      {items.map((item) => (
        <CartLineItem
          key={item.id}
          variant={variant}
          productName={item.productName}
          variantName={item.variantName}
          sku={item.sku}
          quantity={item.quantity}
          lineTotal={item.lineTotal}
          linePreviousTotal={item.linePreviousTotal}
          available={item.available}
          image={item.image}
          onQuantityChange={async (quantity) => {
            const formData = new FormData();
            formData.set("cartId", cartId);
            formData.set("variantId", item.variantId);
            formData.set("quantity", String(quantity));
            await updateCartQuantity(formData);
          }}
          onRemove={async () => {
            const formData = new FormData();
            formData.set("cartId", cartId);
            formData.set("variantId", item.variantId);
            await removeCartLine(formData);
          }}
        />
      ))}
    </div>
  );
}
