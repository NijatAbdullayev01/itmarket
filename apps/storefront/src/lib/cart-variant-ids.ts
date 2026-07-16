import { getCart } from "@/lib/api";

export async function getCartVariantIds(cartId?: string): Promise<string[]> {
  if (!cartId) {
    return [];
  }

  try {
    const cart = await getCart(cartId);
    return cart.items.map((item) => item.variantId);
  } catch {
    return [];
  }
}
