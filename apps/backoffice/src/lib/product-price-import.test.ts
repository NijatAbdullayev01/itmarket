import { describe, expect, it } from "vitest";

import {
  normalizeProductPriceImportMoney,
  parseProductPriceImportSheet,
  PRODUCT_PRICE_IMPORT_HEADERS,
} from "./product-price-import";

describe("product price import parser", () => {
  it("normalizes numeric and locale money values", () => {
    expect(normalizeProductPriceImportMoney(1299.5)).toBe("1299.50");
    expect(normalizeProductPriceImportMoney("1 299,50")).toBe("1299.50");
    expect(normalizeProductPriceImportMoney("450")).toBe("450.00");
    expect(normalizeProductPriceImportMoney("")).toBeNull();
    expect(normalizeProductPriceImportMoney(-1)).toBeNull();
  });

  it("parses brand/model/price rows from a sheet matrix", () => {
    const result = parseProductPriceImportSheet([
      [...PRODUCT_PRICE_IMPORT_HEADERS],
      ["Cisco", "3560", 450, ""],
      ["Apple", "iPhone 15", "2499,99", "2799.99"],
      ["", "", "", ""],
    ]);

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      {
        rowNumber: 2,
        brand: "Cisco",
        model: "3560",
        price: "450.00",
        previousPrice: null,
      },
      {
        rowNumber: 3,
        brand: "Apple",
        model: "iPhone 15",
        price: "2499.99",
        previousPrice: "2799.99",
      },
    ]);
  });

  it("reports missing required columns", () => {
    const result = parseProductPriceImportSheet([
      ["Name", "Amount"],
      ["Cisco 3560", 100],
    ]);
    expect(result.rows).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
