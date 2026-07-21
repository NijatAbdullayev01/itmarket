export const COMPARE_STORAGE_KEY = "itmarket_compare";
export const MAX_COMPARE_ITEMS = 4;

export type CompareItem = {
  /** Parent product id (reviews, favorites). */
  id: string;
  /** Catalog/compare row identity — one card per variant. */
  variantId: string;
  slug: string;
  name: string;
  categorySlug: string;
};

export function readCompareItems(): CompareItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry): CompareItem | null => {
        if (typeof entry !== "object" || entry === null) {
          return null;
        }

        const item = entry as Record<string, unknown>;
        if (
          typeof item.id !== "string" ||
          typeof item.slug !== "string" ||
          typeof item.name !== "string" ||
          typeof item.categorySlug !== "string"
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
          categorySlug: item.categorySlug,
        };
      })
      .filter((item): item is CompareItem => item !== null);
  } catch {
    return [];
  }
}

export function writeCompareItems(items: CompareItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(items));
}

export function isVariantInCompare(variantId: string, items: CompareItem[]) {
  return items.some((item) => item.variantId === variantId);
}

export function countCompareItemsInCategory(
  categorySlug: string,
  items: CompareItem[],
) {
  return items.filter((item) => item.categorySlug === categorySlug).length;
}

export function toggleCompareItem(
  product: CompareItem,
  items: CompareItem[],
): { items: CompareItem[]; added: boolean; full: boolean } {
  const exists = isVariantInCompare(product.variantId, items);
  if (exists) {
    return {
      items: items.filter((item) => item.variantId !== product.variantId),
      added: false,
      full: false,
    };
  }

  if (countCompareItemsInCategory(product.categorySlug, items) >= MAX_COMPARE_ITEMS) {
    return { items, added: false, full: true };
  }

  return {
    items: [...items, product],
    added: true,
    full: false,
  };
}
