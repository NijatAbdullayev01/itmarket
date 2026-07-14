"use client";

import { removeCartLine, updateCartQuantity } from "@/app/actions";
import { CartLineItem } from "@itmarket/ui";

type CartLine = {
  id: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  lineTotal: string;
  available: number;
};

type CartLinesProps = {
  cartId: string;
  items: CartLine[];
};

export function CartLines({ cartId, items }: CartLinesProps) {
  return (
    <div className="ui-cart-lines">
      {items.map((item) => (
        <CartLineItem
          key={item.id}
          productName={item.productName}
          variantName={item.variantName}
          sku={item.sku}
          quantity={item.quantity}
          lineTotal={item.lineTotal}
          available={item.available}
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
