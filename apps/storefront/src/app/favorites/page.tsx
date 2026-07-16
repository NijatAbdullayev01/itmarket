import { FavoritesView } from "@/app/favorites/favorites-view";
import { getGuestCartSession } from "@/lib/cart-session";
import { getCartVariantIds } from "@/lib/cart-variant-ids";

export const metadata = {
  title: "Sevimlilər",
  description: "Sevimlilərə əlavə etdiyiniz məhsulları burada görə bilərsiniz.",
};

export default async function FavoritesPage() {
  const cartSession = await getGuestCartSession();
  const cartVariantIds = await getCartVariantIds(cartSession.cartId);

  return (
    <div className="ui-container">
      <FavoritesView
        cartId={cartSession.cartId}
        cartVariantIds={cartVariantIds}
      />
    </div>
  );
}
