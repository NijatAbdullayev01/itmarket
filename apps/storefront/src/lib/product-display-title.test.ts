import { describe, expect, it } from "vitest";

import { buildProductCatalogDisplayTitle } from "@itmarket/ui";

import {
  getStorefrontProductDisplayTitle,
  getStorefrontProductDisplayTitleFromSummary,
} from "./product-display-title";

describe("buildProductCatalogDisplayTitle", () => {
  it("joins brand and model in catalog creation order", () => {
    expect(
      buildProductCatalogDisplayTitle({
        brandName: "Apple",
        modelName: "iPhone 17 Pro",
      }),
    ).toBe("Apple iPhone 17 Pro");
  });

  it("avoids duplicating brand when legacy model name already includes it", () => {
    expect(
      buildProductCatalogDisplayTitle({
        brandName: "Apple",
        modelName: 'Apple MacBook Air 13" M3',
      }),
    ).toBe('Apple MacBook Air 13" M3');
  });

  it("returns model only when brand is missing on storefront", () => {
    expect(
      getStorefrontProductDisplayTitle({
        name: "ThinkPad X1",
        brand: null,
      }),
    ).toBe("ThinkPad X1");
  });

  it("includes default variant color in catalog summary title", () => {
    expect(
      getStorefrontProductDisplayTitleFromSummary({
        name: "iPhone 17 Pro",
        brand: { name: "Apple" },
        variantName: "256 GB / 8 GB",
        variantAttributes: { Rəng: "Titan Mavi" },
      }),
    ).toBe("Apple iPhone 17 Pro Titan Mavi");
  });

  it("does not append networking transfer speed as a color in the title", () => {
    expect(
      getStorefrontProductDisplayTitleFromSummary({
        name: "nnnnnn 2meagbit",
        brand: { name: "Cisco" },
        variantName: "100m / 24 port / 2meagbit",
        variantAttributes: { "Ötürmə sürəti": "2meagbit" },
      }),
    ).toBe("Cisco nnnnnn 2meagbit");
  });

  it("includes color from product detail variants when summary fields are absent", () => {
    expect(
      getStorefrontProductDisplayTitleFromSummary({
        name: "iPhone 17 Pro",
        brand: { name: "Apple" },
        variants: [
          {
            name: "256 GB",
            attributes: { Rəng: "Gümüşü" },
            available: 3,
          },
        ],
      }),
    ).toBe("Apple iPhone 17 Pro Gümüşü");
  });

  it("prefers first in-stock variant color on product detail", () => {
    expect(
      getStorefrontProductDisplayTitleFromSummary({
        name: "iPhone 17 Pro",
        brand: { name: "Apple" },
        variants: [
          {
            name: "256 GB",
            attributes: { Rəng: "Qara" },
            available: 0,
          },
          {
            name: "256 GB",
            attributes: { Rəng: "Gümüşü" },
            available: 2,
          },
        ],
      }),
    ).toBe("Apple iPhone 17 Pro Gümüşü");
  });

  it("uses missing brand label before model in admin-style input", () => {
    expect(
      buildProductCatalogDisplayTitle({
        brandName: null,
        modelName: "Galaxy S25",
        missingBrandLabel: "Brend yoxdur",
      }),
    ).toBe("Brend yoxdur Galaxy S25");
  });

  it("appends color after brand and model", () => {
    expect(
      buildProductCatalogDisplayTitle({
        brandName: "Apple",
        modelName: "iPhone 17 Pro",
        colorName: "Titan Mavi",
      }),
    ).toBe("Apple iPhone 17 Pro Titan Mavi");
  });

  it("appends HP part number from required specs in the product title", () => {
    expect(
      getStorefrontProductDisplayTitle(
        {
          name: "HP EliteBook x360 1040 G10",
          brand: { name: "HP", slug: "hp" },
          requiredSpecs: [{ label: "Part number", value: "8X9C9EA" }],
        },
        { sku: "HP-8X9C9EA" },
      ),
    ).toBe("HP EliteBook x360 1040 G10 (8X9C9EA)");
  });

  it("appends HP part number from auto SKU when specs are missing", () => {
    expect(
      getStorefrontProductDisplayTitleFromSummary({
        name: "HP EliteBook x360 1040 G10",
        brand: { name: "HP", slug: "hp" },
        sku: "HP-8X9C9EA",
      }),
    ).toBe("HP EliteBook x360 1040 G10 (8X9C9EA)");
  });

  it("does not duplicate an HP part number already in the title", () => {
    expect(
      getStorefrontProductDisplayTitle({
        name: "HP EliteBook x360 1040 G10 (8X9C9EA)",
        brand: { name: "HP", slug: "hp" },
        requiredSpecs: [{ label: "Part number", value: "8X9C9EA" }],
      }),
    ).toBe("HP EliteBook x360 1040 G10 (8X9C9EA)");
  });

  it("appends Lenovo part number from required specs in the product title", () => {
    expect(
      getStorefrontProductDisplayTitle(
        {
          name: "Lenovo ThinkBook 14 G9",
          brand: { name: "Lenovo", slug: "lenovo" },
          requiredSpecs: [{ label: "Part number", value: "21UY000UFW" }],
        },
        { sku: "LEN-21UY000UFW" },
      ),
    ).toBe("Lenovo ThinkBook 14 G9 (21UY000UFW)");
  });

  it("appends Dell part number from required specs in the product title", () => {
    expect(
      getStorefrontProductDisplayTitle(
        {
          name: "Dell PowerEdge R350",
          brand: { name: "Dell", slug: "dell" },
          requiredSpecs: [{ label: "Part number", value: "210-BBRU-E-2314" }],
        },
        { sku: "DELL-210BBRUE2314" },
      ),
    ).toBe("Dell PowerEdge R350 (210-BBRU-E-2314)");
  });

  it("does not append a site-generated SKU as a part number", () => {
    expect(
      getStorefrontProductDisplayTitle(
        {
          name: "Galaxy Book4",
          brand: { name: "Samsung", slug: "samsung" },
        },
        { sku: "SAM-GB4-512G" },
      ),
    ).toBe("Samsung Galaxy Book4");
  });

  it("appends a part number for any brand when required specs include it", () => {
    expect(
      getStorefrontProductDisplayTitle({
        name: "GS1900-24HP",
        brand: { name: "Zyxel", slug: "zyxel" },
        requiredSpecs: [{ label: "Part nömrəsi", value: "GS1900-24HP-EU0101F" }],
      }),
    ).toBe("Zyxel GS1900-24HP (GS1900-24HP-EU0101F)");
  });

  it("appends a compact Model spec when it is a manufacturer code", () => {
    expect(
      getStorefrontProductDisplayTitle({
        name: "HDMI 4K kabel 2 m qara",
        brand: { name: "UGREEN", slug: "ugreen" },
        requiredSpecs: [{ label: "Model", value: "HD104" }],
      }),
    ).toBe("UGREEN HDMI 4K kabel 2 m qara (HD104)");
  });

  it("does not append a marketing Model spec that repeats the product name", () => {
    expect(
      getStorefrontProductDisplayTitle({
        name: "ThinkBook 14 G9",
        brand: { name: "Lenovo", slug: "lenovo" },
        requiredSpecs: [{ label: "Model", value: "ThinkBook 14 G9" }],
      }),
    ).toBe("Lenovo ThinkBook 14 G9");
  });

  it("reads a part number from variant attributes when specs omit it", () => {
    expect(
      getStorefrontProductDisplayTitle(
        {
          name: "GS1900-24HP",
          brand: { name: "Zyxel", slug: "zyxel" },
        },
        {
          attributes: { "Part nömrəsi": "GS1900-24HP-EU0101F" },
        },
      ),
    ).toBe("Zyxel GS1900-24HP (GS1900-24HP-EU0101F)");
  });

  it("keeps variant color before an existing parenthetical part number", () => {
    expect(
      getStorefrontProductDisplayTitleFromSummary({
        name: "iPhone 17 Pro (MFY13)",
        brand: { name: "Apple" },
        variantName: "256 GB / 8 GB",
        variantAttributes: { Rəng: "Titan Mavi" },
      }),
    ).toBe("Apple iPhone 17 Pro Titan Mavi (MFY13)");
  });
});
