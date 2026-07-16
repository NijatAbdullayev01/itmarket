export const FAVORITES_STORAGE_KEY = "itmarket_favorites";

export type FavoriteItem = {
  id: string;
  slug: string;
  name: string;
};

export function readFavoriteItems(): FavoriteItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is FavoriteItem =>
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        typeof item.slug === "string" &&
        typeof item.name === "string",
    );
  } catch {
    return [];
  }
}

export function writeFavoriteItems(items: FavoriteItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items));
}

export function isProductInFavorites(productId: string, items: FavoriteItem[]) {
  return items.some((item) => item.id === productId);
}

export function toggleFavoriteItem(
  product: FavoriteItem,
  items: FavoriteItem[],
): { items: FavoriteItem[]; added: boolean } {
  const exists = isProductInFavorites(product.id, items);
  if (exists) {
    return {
      items: items.filter((item) => item.id !== product.id),
      added: false,
    };
  }

  return {
    items: [...items, product],
    added: true,
  };
}
