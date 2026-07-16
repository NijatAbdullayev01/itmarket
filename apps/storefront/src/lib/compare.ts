export const COMPARE_STORAGE_KEY = "itmarket_compare";
export const MAX_COMPARE_ITEMS = 4;

export type CompareItem = {
  id: string;
  slug: string;
  name: string;
};

export function readCompareItems(): CompareItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is CompareItem =>
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

export function writeCompareItems(items: CompareItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(items));
}

export function isProductInCompare(productId: string, items: CompareItem[]) {
  return items.some((item) => item.id === productId);
}

export function toggleCompareItem(
  product: CompareItem,
  items: CompareItem[],
): { items: CompareItem[]; added: boolean; full: boolean } {
  const exists = isProductInCompare(product.id, items);
  if (exists) {
    return {
      items: items.filter((item) => item.id !== product.id),
      added: false,
      full: false,
    };
  }

  if (items.length >= MAX_COMPARE_ITEMS) {
    return { items, added: false, full: true };
  }

  return {
    items: [...items, product],
    added: true,
    full: false,
  };
}
