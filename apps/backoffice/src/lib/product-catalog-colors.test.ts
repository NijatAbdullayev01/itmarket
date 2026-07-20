import { describe, expect, it } from "vitest";

import {
  catalogColorLabelEquals,
  listProductCatalogColorOptions,
  mergeProductCatalogColorOptions,
  PRODUCT_CATALOG_COLORS,
} from "./product-catalog-colors";
import { isColorSpecLabel } from "./product-required-specs";
import { requiredSpecEntriesToRows } from "./product-existing-catalog";

describe("isColorSpecLabel", () => {
  it("detects Azerbaijani and English color attribute labels", () => {
    expect(isColorSpecLabel("Rəng")).toBe(true);
    expect(isColorSpecLabel("  rəng  ")).toBe(true);
    expect(isColorSpecLabel("Color")).toBe(true);
    expect(isColorSpecLabel("Müvəqqəti yaddaş")).toBe(false);
  });
});

describe("listProductCatalogColorOptions", () => {
  it("returns the full catalog list", () => {
    expect(listProductCatalogColorOptions("")).toEqual([...PRODUCT_CATALOG_COLORS]);
  });

  it("prepends a custom value when not in the catalog", () => {
    expect(listProductCatalogColorOptions("Xüsusi rəng")[0]).toBe("Xüsusi rəng");
    expect(listProductCatalogColorOptions("Qara")).toEqual([
      ...PRODUCT_CATALOG_COLORS,
    ]);
  });
});

describe("catalogColorLabelEquals", () => {
  it("compares color labels case-insensitively in Azerbaijani locale", () => {
    expect(catalogColorLabelEquals("  Qara ", "qara")).toBe(true);
    expect(catalogColorLabelEquals("Mavi", "Yaşıl")).toBe(false);
  });
});

describe("mergeProductCatalogColorOptions", () => {
  it("appends session-only colors without duplicates", () => {
    expect(
      mergeProductCatalogColorOptions("", ["Xüsusi rəng", "Qara", "xüsusi rəng"]),
    ).toEqual([...PRODUCT_CATALOG_COLORS, "Xüsusi rəng"]);
  });

  it("omits excluded custom color labels", () => {
    expect(
      mergeProductCatalogColorOptions(
        "Açıq mavi",
        ["Açıq mavi"],
        ["Açıq mavi"],
      ),
    ).toEqual([...PRODUCT_CATALOG_COLORS]);
  });
});

describe("requiredSpecEntriesToRows", () => {
  it("loads color hex from Rəng kodu without showing a separate row", () => {
    const rows = requiredSpecEntriesToRows([
      { label: "Rəng", value: "Göy" },
      { label: "Rəng kodu", value: "#2563eb" },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.label).toBe("Rəng");
    expect(rows[0]?.value).toBe("Göy");
    expect(rows[0]?.colorHex).toBe("#2563eb");
  });
});
