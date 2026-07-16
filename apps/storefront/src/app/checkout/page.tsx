import { redirect } from "next/navigation";

import { checkoutCash, checkoutOnline } from "@/app/actions";
import { CartLines } from "@/app/cart/cart-lines";
import {
  getCart,
  getFulfillmentOptions,
  getPaymentOptions,
} from "@/lib/api";
import { getGuestCartSession } from "@/lib/cart-session";
import { CheckoutProgressBar, CheckoutWizard } from "@itmarket/ui";

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

  return (
    <div className="ui-container">
      <CheckoutProgressBar />
      <h1 className="ui-page-title">Sifarişi rəsmiləşdir</h1>
      <section className="ui-cart-layout">
        <div>
          <CartLines cartId={cart.id} items={cart.items} />
        </div>
        <div>
          <CheckoutWizard
            cartId={cart.id}
            subtotal={cart.subtotal}
            initialFulfillment={fulfillment}
            paymentMethods={paymentOptions.methods}
            checkoutCashAction={checkoutCash}
            checkoutOnlineAction={checkoutOnline}
          />
        </div>
      </section>
    </div>
  );
}
