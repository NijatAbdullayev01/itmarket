import { describe, expect, it } from "vitest";

import { buildProductSpecEntries } from "@itmarket/ui";

describe("buildProductSpecEntries", () => {
  it("shows all required specs from backoffice with SKU first", () => {
    expect(
      buildProductSpecEntries({
        sku: "APP-IP17P-256G-12G",
        brandName: "Apple",
        modelName: "iPhone 17 Pro",
        requiredSpecs: [
          { label: "Müvəqqəti yaddaş", value: "12GB" },
          { label: "Daimi yaddaş", value: "256GB" },
          { label: "Ekran", value: "6.3\"" },
        ],
      }),
    ).toEqual([
      ["SKU", "APP-IP17P-256G-12G"],
      ["Marka", "Apple"],
      ["Model", "iPhone 17 Pro"],
      ["Müvəqqəti yaddaş", "12GB"],
      ["Daimi yaddaş", "256GB"],
      ["Ekran", "6.3\""],
    ]);
  });

  it("does not duplicate marka or model when already in required specs", () => {
    expect(
      buildProductSpecEntries({
        sku: "SKU-1",
        brandName: "Apple",
        modelName: "iPhone 17 Pro",
        requiredSpecs: [
          { label: "Marka", value: "Apple" },
          { label: "Model", value: "iPhone 17 Pro" },
          { label: "RAM", value: "8GB" },
        ],
      }),
    ).toEqual([
      ["SKU", "SKU-1"],
      ["Marka", "Apple"],
      ["Model", "iPhone 17 Pro"],
      ["RAM", "8GB"],
    ]);
  });

  it("overlays RAM and storage from the selected variant", () => {
    expect(
      buildProductSpecEntries({
        sku: "SKU-512",
        requiredSpecs: [
          { label: "Müvəqqəti yaddaş", value: "8GB" },
          { label: "Daimi yaddaş", value: "128GB" },
        ],
        variantAttributes: { RAM: "12GB", Yaddaş: "512GB" },
      }),
    ).toEqual([
      ["SKU", "SKU-512"],
      ["Müvəqqəti yaddaş", "12GB"],
      ["Daimi yaddaş", "512GB"],
    ]);
  });

  it("falls back to variant attributes when required specs are empty", () => {
    expect(
      buildProductSpecEntries({
        sku: "LEG-1",
        requiredSpecs: [],
        variantAttributes: { RAM: "8GB", Yaddaş: "128GB" },
      }),
    ).toEqual([
      ["SKU", "LEG-1"],
      ["RAM", "8GB"],
      ["Yaddaş", "128GB"],
    ]);
  });

  it("omits internal color hex rows from the specs table", () => {
    expect(
      buildProductSpecEntries({
        sku: "SKU-COLOR",
        requiredSpecs: [
          { label: "Rəng", value: "Göy" },
          { label: "Rəng kodu", value: "#2563eb" },
        ],
      }),
    ).toEqual([
      ["SKU", "SKU-COLOR"],
      ["Rəng", "Göy"],
    ]);
  });
});
