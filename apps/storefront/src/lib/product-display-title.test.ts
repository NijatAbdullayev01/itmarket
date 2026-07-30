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
});
