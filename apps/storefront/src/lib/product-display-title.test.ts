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
