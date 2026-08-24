import { describe, expect, it } from "vitest";

import {
  buildCreateCatalogVariantPayload,
  buildUpdateCatalogVariantMetadataPayload,
  buildVariantSubmitFormData,
  followGeneratedSkuUnlessCustomized,
  validateSkuVariantFields,
} from "./product-variant-form";

describe("product-variant-form color metadata", () => {
  it("preserves custom color hex through the FormData round-trip", () => {
    const form = buildVariantSubmitFormData({
      variantSku: "SKU-COLOR-1",
      variantBarcode: "",
      variantPrice: "199.99",
      variantDiscountedPrice: "",
      requiredSpecEntries: [
        { label: "Rəng", value: "Göy" },
        { label: "Rəng kodu", value: "#2563eb" },
        { label: "Daimi yaddaş", value: "128GB" },
        { label: "Müvəqqəti yaddaş", value: "8GB" },
      ],
    });

    const payload = buildUpdateCatalogVariantMetadataPayload(form, "ACTIVE");

    expect(payload.attributes).toMatchObject({
      Rəng: "Göy",
      "Rəng kodu": "#2563eb",
      Yaddaş: "128GB",
      RAM: "8GB",
    });
    expect(payload.availableByOrder).toBe(false);
  });

  it("round-trips availableByOrder through FormData payloads", () => {
    const form = buildVariantSubmitFormData({
      variantSku: "SKU-ORDER-1",
      variantBarcode: "",
      variantPrice: "99.00",
      variantDiscountedPrice: "",
      requiredSpecEntries: [{ label: "Daimi yaddaş", value: "256GB" }],
      availableByOrder: true,
    });

    expect(buildCreateCatalogVariantPayload(form).availableByOrder).toBe(true);
    expect(
      buildUpdateCatalogVariantMetadataPayload(form, "ACTIVE").availableByOrder,
    ).toBe(true);
  });

  it("does not require memory specs when labels are present without values", () => {
    const errors = validateSkuVariantFields({
      productId: "product-1",
      generatedVariantSku: "BRAND-MODEL",
      variantPrice: "199.99",
      variantDiscountedPrice: "",
      requiredSpecEntries: [
        { label: "Daimi yaddaş", value: "" },
        { label: "Müvəqqəti yaddaş", value: "" },
      ],
      variantQuantity: "",
      existingProducts: [],
      canReceiveStock: false,
      defaultStockLocationId: null,
    });

    expect(errors.storage).toBeUndefined();
  });

  it("accepts a manually entered SKU that matches the catalog pattern", () => {
    const errors = validateSkuVariantFields({
      productId: "product-1",
      generatedVariantSku: "CUSTOM-SKU-01",
      variantPrice: "199.99",
      variantDiscountedPrice: "",
      requiredSpecEntries: [],
      variantQuantity: "",
      existingProducts: [],
      canReceiveStock: false,
      defaultStockLocationId: null,
    });

    expect(errors.sku).toBeUndefined();
  });

  it("rejects a manually entered SKU that does not match the catalog pattern", () => {
    const errors = validateSkuVariantFields({
      productId: "product-1",
      generatedVariantSku: "bad sku",
      variantPrice: "199.99",
      variantDiscountedPrice: "",
      requiredSpecEntries: [],
      variantQuantity: "",
      existingProducts: [],
      canReceiveStock: false,
      defaultStockLocationId: null,
    });

    expect(errors.sku).toMatch(/SKU 2–64/);
  });
});

describe("followGeneratedSkuUnlessCustomized", () => {
  it("records the generated SKU on first sync without overwriting an existing value", () => {
    expect(
      followGeneratedSkuUnlessCustomized({
        generatedSku: "TPL-VGC-VAR-80",
        currentSku: "CUSTOM-SKU",
        lastGeneratedSku: null,
      }),
    ).toEqual({
      sku: "CUSTOM-SKU",
      lastGeneratedSku: "TPL-VGC-VAR-80",
    });
  });

  it("follows generated SKU while the field is still empty or auto-filled", () => {
    expect(
      followGeneratedSkuUnlessCustomized({
        generatedSku: "TPL-VGC-VAR-80",
        currentSku: "",
        lastGeneratedSku: "",
      }),
    ).toEqual({
      sku: "TPL-VGC-VAR-80",
      lastGeneratedSku: "TPL-VGC-VAR-80",
    });

    expect(
      followGeneratedSkuUnlessCustomized({
        generatedSku: "TPL-VGC-VAR-128",
        currentSku: "TPL-VGC-VAR-80",
        lastGeneratedSku: "TPL-VGC-VAR-80",
      }),
    ).toEqual({
      sku: "TPL-VGC-VAR-128",
      lastGeneratedSku: "TPL-VGC-VAR-128",
    });
  });

  it("keeps a manually edited SKU when catalog fields change", () => {
    expect(
      followGeneratedSkuUnlessCustomized({
        generatedSku: "TPL-VGC-VAR-128",
        currentSku: "ADMIN-OVERRIDE",
        lastGeneratedSku: "TPL-VGC-VAR-80",
      }),
    ).toEqual({
      sku: "ADMIN-OVERRIDE",
      lastGeneratedSku: "TPL-VGC-VAR-128",
    });
  });
});
