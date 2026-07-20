import { describe, expect, it } from "vitest";

import {
  getManageableCatalogVariants,
  getStorefrontVisibilityHint,
  isArchivedCatalogVariant,
  isProductVisibleOnStorefront,
} from "./product-storefront-visibility";

describe("isProductVisibleOnStorefront", () => {
  it("requires an active variant when product and category are active", () => {
    expect(
      isProductVisibleOnStorefront({
        status: "ACTIVE",
        category: { status: "ACTIVE" },
        variants: [],
      }),
    ).toBe(false);

    expect(
      isProductVisibleOnStorefront({
        status: "ACTIVE",
        category: { status: "ACTIVE" },
        variants: [{ status: "DRAFT" }],
      }),
    ).toBe(false);

    expect(
      isProductVisibleOnStorefront({
        status: "ACTIVE",
        category: { status: "ACTIVE" },
        variants: [{ status: "ACTIVE" }],
      }),
    ).toBe(true);
  });

  it("returns a hint when variants are missing", () => {
    expect(
      getStorefrontVisibilityHint({
        status: "ACTIVE",
        category: { status: "ACTIVE" },
        variants: [],
      }),
    ).toMatch(/SKU variant/);
  });
});

describe("isArchivedCatalogVariant", () => {
  it("treats archived status and archived SKU prefix as archived", () => {
    expect(isArchivedCatalogVariant({ status: "ARCHIVED", sku: "foo" })).toBe(
      true,
    );
    expect(
      isArchivedCatalogVariant({
        sku: "archived-550e8400-e29b-41d4-a716-446655440000",
      }),
    ).toBe(true);
    expect(isArchivedCatalogVariant({ status: "ACTIVE", sku: "iphone-128" })).toBe(
      false,
    );
  });

  it("filters archived rows for backoffice variant lists", () => {
    expect(
      getManageableCatalogVariants([
        { id: "a", status: "ACTIVE", sku: "one" },
        { id: "b", status: "ARCHIVED", sku: "archived-b" },
      ] as const),
    ).toEqual([{ id: "a", status: "ACTIVE", sku: "one" }]);
  });
});
