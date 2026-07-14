import Link from "next/link";
import { checkoutCash, checkoutOnline } from "@/app/actions";
import { CartLines } from "@/app/cart/cart-lines";
import { getCart, getFulfillmentOptions, getPaymentOptions } from "@/lib/api";
import { getGuestCartSession } from "@/lib/cart-session";
import { formatAzn } from "@/lib/format-azn";
import {
  CheckoutWizard,
  EmptyState,
  EmptyStateLink,
  OrderSummary,
} from "@itmarket/ui";

export const metadata = {
  title: "Səbət və checkout",
  description: "IT Market səbəti, delivery/pickup və nağd ödəniş checkout-u.",
};

export default async function CartPage({
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
    return (
      <div className="ui-container">
        <h1 className="ui-page-title">Səbətiniz boşdur</h1>
        <EmptyState
          title="Hələ məhsul seçməmisiniz"
          description="Məhsul seçmək üçün kataloqa baxın."
          action={<EmptyStateLink href="/" label="Kataloqa bax" />}
        />
      </div>
    );
  }

  const [cart, fulfillment, paymentOptions] = await Promise.all([
    getCart(cartId),
    getFulfillmentOptions(cartId),
    getPaymentOptions(cartId),
  ]);

  return (
    <div className="ui-container">
      <nav className="ui-breadcrumb" aria-label="Səhifə yolu">
        <Link href="/">Kataloq</Link>
        <span aria-hidden="true">/</span>
        <span>Səbət</span>
      </nav>
      <h1 className="ui-page-title">Sifarişi tamamla</h1>
      <section className="ui-cart-layout">
        <div>
          {cart.items.length === 0 ? (
            <EmptyState
              title="Səbətiniz boşdur"
              description="Seçilmiş məhsullar burada görünəcək."
              action={<EmptyStateLink href="/" label="Kataloqa bax" />}
            />
          ) : (
            <CartLines cartId={cart.id} items={cart.items} />
          )}
        </div>
        <div>
          <OrderSummary subtotal={cart.subtotal} />
          {cart.items.length > 0 ? (
            <CheckoutWizard
              cartId={cart.id}
              subtotal={cart.subtotal}
              initialFulfillment={fulfillment}
              paymentMethods={paymentOptions.methods}
              checkoutCashAction={checkoutCash}
              checkoutOnlineAction={checkoutOnline}
            />
          ) : null}
        </div>
      </section>
      {cart.items.length > 0 ? (
        <div className="ui-mobile-cart-bar" aria-hidden="true">
          <div>
            <span style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
              Cəmi
            </span>
            <div style={{ fontWeight: 700 }}>{formatAzn(Number(cart.subtotal))}</div>
          </div>
          <a className="ui-btn ui-btn--primary" href="#esas-mezmun">
            Davam et
          </a>
        </div>
      ) : null}
    </div>
  );
}
