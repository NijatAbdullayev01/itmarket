import { describe, expect, it } from "vitest";

import {
  buildProductCatalogExportRows,
  PRODUCT_CATALOG_EXPORT_HEADERS,
} from "./product-catalog-export";

describe("buildProductCatalogExportRows", () => {
  it("sorts products and variants and emits one row per variant", () => {
    const rows = buildProductCatalogExportRows([
      {
        name: "Z Phone",
        variants: [
          {
            sku: "Z-256",
            name: "256 GB",
            price: "999.50",
            barcode: "111",
          },
          {
            sku: "Z-128",
            name: "128 GB",
            price: "799",
            barcode: null,
          },
        ],
      },
      {
        name: "A Phone",
        variants: [
          {
            sku: "A-1",
            name: "Standart",
            price: "500",
            barcode: "222",
          },
        ],
      },
    ]);

    expect(rows).toEqual([
      {
        productName: "A Phone",
        variantName: "Standart",
        sku: "A-1",
        price: 500,
        barcode: "222",
      },
      {
        productName: "Z Phone",
        variantName: "128 GB",
        sku: "Z-128",
        price: 799,
        barcode: "",
      },
      {
        productName: "Z Phone",
        variantName: "256 GB",
        sku: "Z-256",
        price: 999.5,
        barcode: "111",
      },
    ]);
  });

  it("includes a product row when it has no variants", () => {
    const rows = buildProductCatalogExportRows([
      {
        name: "Boş məhsul",
        variants: [],
      },
    ]);

    expect(rows).toEqual([
      {
        productName: "Boş məhsul",
        variantName: "",
        sku: "",
        price: "",
        barcode: "",
      },
    ]);
  });

  it("defines stable column headers for Excel export", () => {
    expect(PRODUCT_CATALOG_EXPORT_HEADERS).toEqual([
      "Məhsul adı",
      "Variant",
      "SKU",
      "Qiymət (AZN)",
      "Barkod",
    ]);
  });
});
