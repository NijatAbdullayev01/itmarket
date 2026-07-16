import Link from "next/link";

import { CartLines } from "@/app/cart/cart-lines";
import { getCart } from "@/lib/api";
import { getGuestCartSession } from "@/lib/cart-session";
import { formatAznValue } from "@/lib/format-azn";
import { EmptyState, EmptyStateLink, IconCart, OrderSummary } from "@itmarket/ui";

const cartEmptyIcon = <IconCart width={40} height={40} />;

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
        <EmptyState
          title="Hələ məhsul seçməmisiniz"
          description="Məhsul seçmək üçün kataloqa baxın."
          icon={cartEmptyIcon}
          action={<EmptyStateLink href="/" label="Məhsullara bax" />}
        />
      </div>
    );
  }

  const cart = await getCart(cartId);
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

  const checkoutHref = "/checkout";

  return (
    <div className="ui-container">
      {cart.items.length === 0 ? (
        <EmptyState
          title="Səbətiniz boşdur"
          description='Daha çox məhsul üçün "Məhsullara bax" düyməsinə klik edin.'
          icon={cartEmptyIcon}
          action={<EmptyStateLink href="/" label="Məhsullara bax" />}
        />
      ) : (
        <section className="ui-cart-layout">
          <div>
            <CartLines cartId={cart.id} items={cart.items} />
          </div>
          <div>
            <OrderSummary
              subtotal={cart.subtotal}
              itemCount={itemCount}
              discountTotal={discountTotal}
            />
            <p className="ui-order-summary-disclaimer">
              Sifarişi rəsmiləşdirməzdən öncə,{" "}
              <Link className="ui-order-summary-disclaimer__link" href="/terms">
                şərtlər
              </Link>
              -lə tanış olun
            </p>
            <Link
              className="ui-btn ui-btn--primary ui-btn--block ui-order-summary-checkout ui-product-purchase__cta"
              href={checkoutHref}
            >
              <IconCart width={20} height={20} />
              Sifarişi rəsmiləşdir
            </Link>
          </div>
        </section>
      )}
      {cart.items.length > 0 ? (
        <div className="ui-mobile-cart-bar" aria-hidden="true">
          <div>
            <span style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
              Cəmi
            </span>
            <div style={{ fontWeight: 700 }}>
              {formatAznValue(cart.subtotal) ?? "—"}
            </div>
          </div>
          <Link
            className="ui-btn ui-btn--primary ui-product-purchase__cta"
            href={checkoutHref}
          >
            <IconCart width={20} height={20} />
            Sifarişi rəsmiləşdir
          </Link>
        </div>
      ) : null}
    </div>
  );
}
