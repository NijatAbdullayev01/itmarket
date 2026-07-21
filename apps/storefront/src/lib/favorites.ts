export const FAVORITES_STORAGE_KEY = "itmarket_favorites";

export type FavoriteItem = {
  /** Parent product id (reviews, detail fetch). */
  id: string;
  /** Catalog/favorites row identity — one entry per variant. */
  variantId: string;
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

    return parsed
      .map((entry): FavoriteItem | null => {
        if (typeof entry !== "object" || entry === null) {
          return null;
        }

        const item = entry as Record<string, unknown>;
        if (
          typeof item.id !== "string" ||
          typeof item.slug !== "string" ||
          typeof item.name !== "string"
        ) {
          return null;
        }

        const variantId =
          typeof item.variantId === "string" ? item.variantId : item.id;

        return {
          id: item.id,
          variantId,
          slug: item.slug,
          name: item.name,
        };
      })
      .filter((item): item is FavoriteItem => item !== null);
  } catch {
    return [];
  }
}

export function writeFavoriteItems(items: FavoriteItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items));
}

export function isVariantInFavorites(variantId: string, items: FavoriteItem[]) {
  return items.some((item) => item.variantId === variantId);
}

export function toggleFavoriteItem(
  product: FavoriteItem,
  items: FavoriteItem[],
): { items: FavoriteItem[]; added: boolean } {
  const exists = isVariantInFavorites(product.variantId, items);
  if (exists) {
    return {
      items: items.filter((item) => item.variantId !== product.variantId),
      added: false,
    };
  }

  return {
    items: [...items, product],
    added: true,
  };
}
