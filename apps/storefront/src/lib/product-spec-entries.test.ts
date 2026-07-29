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

  it("overlays color from the selected variant over product required specs", () => {
    expect(
      buildProductSpecEntries({
        sku: "SKU-RED",
        requiredSpecs: [
          { label: "Rəng", value: "Qara" },
          { label: "Daimi yaddaş", value: "128GB" },
        ],
        variantAttributes: { Rəng: "Qırmızı", Yaddaş: "256GB" },
      }),
    ).toEqual([
      ["SKU", "SKU-RED"],
      ["Rəng", "Qırmızı"],
      ["Daimi yaddaş", "256GB"],
    ]);
  });

  it("appends color from the selected variant when product specs omit it", () => {
    expect(
      buildProductSpecEntries({
        sku: "SKU-BLUE",
        requiredSpecs: [
          { label: "Müvəqqəti yaddaş", value: "8GB" },
          { label: "Daimi yaddaş", value: "128GB" },
          { label: "Rəng", value: "" },
        ],
        variantAttributes: {
          Rəng: "Titan Mavi",
          "Rəng kodu": "#1e3a5f",
          RAM: "8GB",
          Yaddaş: "128GB",
        },
      }),
    ).toEqual([
      ["SKU", "SKU-BLUE"],
      ["Müvəqqəti yaddaş", "8GB"],
      ["Daimi yaddaş", "128GB"],
      ["Rəng", "Titan Mavi"],
    ]);
  });

  it("fills empty required-spec templates from selected variant attributes", () => {
    expect(
      buildProductSpecEntries({
        sku: "SKU-TMPL",
        requiredSpecs: [
          { label: "Müvəqqəti yaddaş", value: "" },
          { label: "Daimi yaddaş", value: "" },
          { label: "Rəng", value: "" },
        ],
        variantAttributes: {
          RAM: "12GB",
          Yaddaş: "512GB",
          Rəng: "Qara",
        },
      }),
    ).toEqual([
      ["SKU", "SKU-TMPL"],
      ["Müvəqqəti yaddaş", "12GB"],
      ["Daimi yaddaş", "512GB"],
      ["Rəng", "Qara"],
    ]);
  });

  it("appends storage and RAM from variant when product specs omit them", () => {
    expect(
      buildProductSpecEntries({
        sku: "SKU-APPEND",
        requiredSpecs: [{ label: "Ekran", value: '6.3"' }],
        variantAttributes: { RAM: "8GB", Yaddaş: "256GB", Rəng: "Boz" },
      }),
    ).toEqual([
      ["SKU", "SKU-APPEND"],
      ["Ekran", '6.3"'],
      ["Rəng", "Boz"],
      ["Daimi yaddaş", "256GB"],
      ["Müvəqqəti yaddaş", "8GB"],
    ]);
  });

  it("omits color hex when falling back to variant attributes only", () => {
    expect(
      buildProductSpecEntries({
        sku: "LEG-COLOR",
        requiredSpecs: [],
        variantAttributes: {
          Rəng: "Gümüşü",
          "Rəng kodu": "#c0c0c0",
          RAM: "8GB",
        },
      }),
    ).toEqual([
      ["SKU", "LEG-COLOR"],
      ["Rəng", "Gümüşü"],
      ["RAM", "8GB"],
    ]);
  });
});
