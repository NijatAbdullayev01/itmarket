import type { Metadata } from "next";

import { FavoritesView } from "@/app/favorites/favorites-view";
import { getGuestCartSession } from "@/lib/cart-session";
import { getCartVariantIds } from "@/lib/cart-variant-ids";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { getMessages } from "@/lib/i18n";
import { noIndexRobots } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  return {
    title: messages.pageMeta.favoritesTitle,
    description: messages.pageMeta.favoritesDescription,
    robots: noIndexRobots,
  };
}

export default async function FavoritesPage() {
  const [cartSession, locale] = await Promise.all([
    getGuestCartSession(),
    getRequestLocale(),
  ]);
  const messages = getMessages(locale);
  const cartVariantIds = await getCartVariantIds(cartSession.cartId);

  return (
    <div className="ui-container">
      <h1 className="ui-page-title ui-page-title--panel">{messages.favorites.title}</h1>
      <FavoritesView
        cartId={cartSession.cartId}
        cartVariantIds={cartVariantIds}
      />
    </div>
  );
}
