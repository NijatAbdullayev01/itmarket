import { describe, expect, it } from "vitest";

import { filterCatalogProductListEntries } from "./catalog-product-list-search";

const apcBrand = { id: "brand-apc", name: "APC" };

const entries = [
  {
    kind: "variant" as const,
    product: {
      name: "Back-UPS 650VA",
      slug: "back-ups-650va",
      brand: apcBrand,
    },
    variant: {
      sku: "BE650G2-GR",
      barcode: "0731304339120",
      name: "USB charging ports",
    },
  },
  {
    kind: "variant" as const,
    product: {
      name: "Back-UPS 750VA",
      slug: "back-ups-750va",
      brand: apcBrand,
    },
    variant: {
      sku: "BX750MI-GR",
      barcode: "0731304339137",
      name: "AVR Schuko",
    },
  },
  {
    kind: "product-only" as const,
    product: {
      name: "Galaxy S24",
      slug: "galaxy-s24",
      brand: { id: "brand-samsung", name: "Samsung" },
    },
  },
];

describe("filterCatalogProductListEntries", () => {
  it("returns every entry when the query is blank", () => {
    expect(filterCatalogProductListEntries(entries, "")).toEqual(entries);
    expect(filterCatalogProductListEntries(entries, "   ")).toEqual(entries);
  });

  it("matches product name, brand, SKU and barcode", () => {
    expect(filterCatalogProductListEntries(entries, "650va")).toEqual([
      entries[0],
    ]);
    expect(filterCatalogProductListEntries(entries, "samsung")).toEqual([
      entries[2],
    ]);
    expect(filterCatalogProductListEntries(entries, "bx750mi")).toEqual([
      entries[1],
    ]);
    expect(filterCatalogProductListEntries(entries, "BX750MI-GR")).toEqual([
      entries[1],
    ]);
    expect(filterCatalogProductListEntries(entries, "0731304339120")).toEqual([
      entries[0],
    ]);
  });

  it("requires every search word to match", () => {
    expect(filterCatalogProductListEntries(entries, "APC 650")).toEqual([
      entries[0],
    ]);
    expect(filterCatalogProductListEntries(entries, "APC 900")).toEqual([]);
  });

  it("is case-insensitive for Azerbaijani locale", () => {
    expect(filterCatalogProductListEntries(entries, "APC")).toEqual([
      entries[0],
      entries[1],
    ]);
    expect(filterCatalogProductListEntries(entries, "  galaxy  ")).toEqual([
      entries[2],
    ]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterCatalogProductListEntries(entries, "bluetti")).toEqual([]);
  });

  it("finds UGREEN products by model code and SKU together", () => {
    const ugreen = {
      kind: "variant" as const,
      product: {
        name: "UGREEN Uno RG 65W GaN 3-port şarj cihazı çəhrayı-göy",
        slug: "ugreen-35855",
        brand: { id: "brand-ugreen", name: "UGREEN" },
        requiredSpecs: [{ label: "Model", value: "CD361" }],
      },
      variant: {
        sku: "35855",
        barcode: null,
        name: "35855",
        attributes: { Model: "CD361" },
      },
    };

    expect(filterCatalogProductListEntries([ugreen], "CD361 35855")).toEqual([
      ugreen,
    ]);
    expect(filterCatalogProductListEntries([ugreen], "cd361")).toEqual([
      ugreen,
    ]);
    expect(filterCatalogProductListEntries([ugreen], "CD-361")).toEqual([
      ugreen,
    ]);
    expect(filterCatalogProductListEntries([ugreen], "35855")).toEqual([
      ugreen,
    ]);
  });
});
