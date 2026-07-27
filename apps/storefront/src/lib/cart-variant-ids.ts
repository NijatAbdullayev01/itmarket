import { getCart } from "@/lib/api";
import { getGuestCartSession } from "@/lib/cart-session";

export async function getCartVariantIds(cartId?: string): Promise<string[]> {
  if (!cartId) {
    return [];
  }

  try {
    const session = await getGuestCartSession();
    if (session.guestToken === undefined) {
      return [];
    }
    const cart = await getCart(cartId, session.guestToken);
    return cart.items.map((item) => item.variantId);
  } catch {
    return [];
  }
}
