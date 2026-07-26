import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { CartLines } from "@/app/cart/cart-lines";
import { getCart } from "@/lib/api";
import { getGuestCartSession } from "@/lib/cart-session";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { getMessages, toOrderSummaryCopy } from "@/lib/i18n";
import { noIndexRobots } from "@/lib/seo";
import { EmptyState, EmptyStateLink, IconCart, OrderSummary } from "@itmarket/ui";

const cartEmptyIcon = <IconCart width={40} height={40} />;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  return {
    title: messages.pageMeta.cartTitle,
    description: messages.pageMeta.cartDescription,
    robots: noIndexRobots,
  };
}

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ cartId?: string }>;
}) {
  const [{ cartId: queryCartId }, session, locale] = await Promise.all([
    searchParams,
    getGuestCartSession(),
    getRequestLocale(),
  ]);
  const messages = getMessages(locale);
  const cartId = queryCartId ?? session.cartId;

  if (cartId === undefined) {
    return (
      <div className="ui-container">
        <h1 className="ui-page-title">{messages.cart.title}</h1>
        <EmptyState
          title={messages.cart.emptyNoSessionTitle}
          description={messages.cart.emptyNoSessionDescription}
          icon={cartEmptyIcon}
          action={<EmptyStateLink href="/" label={messages.common.viewProducts} />}
        />
      </div>
    );
  }

  const cart = await getCart(cartId);
  if (cart.status !== "ACTIVE") {
    redirect(
      `/cart/reset-stale?cartId=${encodeURIComponent(cart.id)}`,
    );
  }

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

  const checkoutHref = `/checkout?cartId=${encodeURIComponent(cart.id)}`;

  return (
    <div className="ui-container">
      <h1 className="ui-page-title">{messages.cart.title}</h1>
      {cart.items.length === 0 ? (
        <EmptyState
          title={messages.cart.emptyTitle}
          description={messages.cart.emptyDescription}
          icon={cartEmptyIcon}
          action={<EmptyStateLink href="/" label={messages.common.viewProducts} />}
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
              copy={toOrderSummaryCopy(messages)}
            />
            <p className="ui-order-summary-disclaimer">
              {messages.cart.termsDisclaimerBefore}{" "}
              <Link className="ui-order-summary-disclaimer__link" href="/terms">
                {messages.cart.termsLink}
              </Link>
              {messages.cart.termsDisclaimerAfter ? ` ${messages.cart.termsDisclaimerAfter}` : ""}
            </p>
            <Link
              className="ui-btn ui-btn--primary ui-btn--block ui-order-summary-checkout ui-product-purchase__cta"
              href={checkoutHref}
            >
              <IconCart width={20} height={20} />
              {messages.cart.checkoutCta}
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
