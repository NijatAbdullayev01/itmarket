import { redirect } from "next/navigation";

import { checkoutCash, checkoutOnline } from "@/app/actions";
import { CheckoutLayout } from "@/app/checkout/checkout-layout";
import {
  getCart,
  getFulfillmentOptions,
  getPaymentOptions,
} from "@/lib/api";
import { getGuestCartSession } from "@/lib/cart-session";
import { CheckoutProgressBar } from "@itmarket/ui";

export const metadata = {
  title: "Sifarişi rəsmiləşdir",
  description:
    "IT Market sifarişi — çatdırılma, pickup və ödəniş seçimləri ilə checkout.",
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ cartId?: string }>;
}) {
  const [{ cartId: queryCartId }, session] = await Promise.all([
    searchParams,
    getGuestCartSession(),
  ]);
  const cartId = queryCartId ?? session.cartId;

  if (cartId === undefined) {
    redirect("/cart");
  }

  const cart = await getCart(cartId);

  if (cart.items.length === 0) {
    redirect("/cart");
  }

  const [fulfillment, paymentOptions] = await Promise.all([
    getFulfillmentOptions(cartId),
    getPaymentOptions(cartId),
  ]);
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const discountTotal = cart.items
    .reduce((sum, item) => {
      if (item.linePreviousTotal === null) {
        return sum;
      }

      const savings = Number(item.linePreviousTotal) - Number(item.lineTotal);
      return savings > 0 ? sum + savings : sum;
    }, 0)
    .toFixed(2);

  return (
    <div className="ui-container">
      <CheckoutProgressBar />
      <CheckoutLayout
        cartId={cart.id}
        subtotal={cart.subtotal}
        itemCount={itemCount}
        discountTotal={discountTotal}
        items={cart.items}
        initialFulfillment={fulfillment}
        paymentMethods={paymentOptions.methods}
        checkoutCashAction={checkoutCash}
        checkoutOnlineAction={checkoutOnline}
      />
    </div>
  );
}
