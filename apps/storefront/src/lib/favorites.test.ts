import { describe, expect, it } from "vitest";

import {
  isVariantInFavorites,
  toggleFavoriteItem,
  type FavoriteItem,
} from "./favorites";

const baseItem = (
  variantId: string,
  overrides: Partial<FavoriteItem> = {},
): FavoriteItem => ({
  id: "product-1",
  variantId,
  slug: "iphone-17-pro",
  name: "Apple iPhone 17 Pro",
  ...overrides,
});

describe("toggleFavoriteItem", () => {
  it("treats variants of the same product as distinct favorite entries", () => {
    const variant256 = baseItem("variant-256");
    const variant1tb = baseItem("variant-1tb");

    const first = toggleFavoriteItem(variant256, []);
    expect(first.added).toBe(true);
    expect(first.items).toHaveLength(1);

    const second = toggleFavoriteItem(variant1tb, first.items);
    expect(second.added).toBe(true);
    expect(second.items).toHaveLength(2);
    expect(isVariantInFavorites("variant-256", second.items)).toBe(true);
    expect(isVariantInFavorites("variant-1tb", second.items)).toBe(true);
  });

  it("removes by variant id without affecting sibling variants", () => {
    const items = [baseItem("variant-256"), baseItem("variant-1tb")];

    const removed = toggleFavoriteItem(baseItem("variant-256"), items);
    expect(removed.added).toBe(false);
    expect(removed.items).toHaveLength(1);
    expect(removed.items[0]?.variantId).toBe("variant-1tb");
  });
});
