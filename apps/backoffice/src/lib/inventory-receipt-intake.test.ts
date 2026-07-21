import { describe, expect, it } from "vitest";

import {
  buildReceiptRequestBody,
  buildReceiptIntakeVariantSku,
  filterReceiptCatalogBrands,
  filterReceiptCatalogModels,
  findReceiptVariantForCatalogInput,
  findReceiptCatalogMatchByBarcode,
  findVariantIdByBarcode,
  hasReceiptVariantCatalogSearch,
  receiptBarcodeConflictsWithCatalogSearch,
  receiptIntakeModelFromSearchQuery,
  receiptVariantMatchesCatalogSearch,
  shouldOfferReceiptIntakeFromSearch,
  shouldCollectReceiptIntakeRequiredSpecs,
  validateReceiptIntakeFields,
  validateReceiptSourceDescription,
} from "./inventory-receipt-intake";

describe("inventory receipt intake", () => {
  const products = [
    {
      id: "product-1",
      name: "iPhone 17 Pro",
      slug: "apple-iphone-17-pro",
      brand: { id: "brand-1", name: "Apple" },
      categoryId: "cat-1",
      requiredSpecs: [],
      variants: [
        {
          id: "variant-1",
          sku: "APPLE-IPHO-STD",
          barcode: "1234567890123",
        },
      ],
    },
  ];

  it("offers intake when search has no matches", () => {
    expect(
      shouldOfferReceiptIntakeFromSearch({
        searchQuery: "Galaxy",
        filteredMatchCount: 0,
        intakeMode: false,
      }),
    ).toBe(true);
    expect(
      shouldOfferReceiptIntakeFromSearch({
        searchQuery: "  ",
        filteredMatchCount: 0,
        intakeMode: false,
      }),
    ).toBe(false);
    expect(
      shouldOfferReceiptIntakeFromSearch({
        searchQuery: "iPhone",
        filteredMatchCount: 2,
        intakeMode: false,
      }),
    ).toBe(false);
    expect(
      shouldOfferReceiptIntakeFromSearch({
        searchQuery: "missing",
        filteredMatchCount: 0,
        intakeMode: true,
      }),
    ).toBe(false);
    expect(receiptIntakeModelFromSearchQuery("  Galaxy S26  ")).toBe("Galaxy S26");
  });

  it("filters catalog brands and models from db lists", () => {
    const brands = [
      { id: "b1", name: "Apple" },
      { id: "b2", name: "Samsung" },
    ];
    expect(filterReceiptCatalogBrands(brands, "sam").map((entry) => entry.name)).toEqual([
      "Samsung",
    ]);
    expect(
      filterReceiptCatalogModels(products, {
        brandName: "Apple",
        modelQuery: "pro",
      }).map((entry) => entry.name),
    ).toEqual(["iPhone 17 Pro"]);
    expect(
      receiptVariantMatchesCatalogSearch(
        { name: "iPhone 17 Pro", brand: { name: "Apple" } },
        { brandName: "Apple", modelName: "17" },
      ),
    ).toBe(true);
    expect(
      receiptVariantMatchesCatalogSearch(
        { name: "iPhone 17 Pro", brand: { name: "Apple" } },
        { brandName: "", modelName: "" },
      ),
    ).toBe(false);
    expect(hasReceiptVariantCatalogSearch({
      brandName: "",
      modelName: "",
      barcode: "",
    })).toBe(false);
    expect(hasReceiptVariantCatalogSearch({
      brandName: "Apple",
      modelName: "",
      barcode: "",
    })).toBe(true);
  });

  it("finds variant by barcode", () => {
    expect(findVariantIdByBarcode(products, "1234567890123")).toBe("variant-1");
    expect(findVariantIdByBarcode(products, "missing")).toBeUndefined();
  });

  it("resolves catalog row from barcode alone", () => {
    expect(
      findReceiptCatalogMatchByBarcode(products, "1234567890123"),
    ).toEqual({
      variantId: "variant-1",
      productId: "product-1",
      brandName: "Apple",
      modelName: "iPhone 17 Pro",
    });
  });

  it("resolves variant when brand, model and barcode match catalog", () => {
    expect(
      findReceiptVariantForCatalogInput(products, {
        brandName: "Apple",
        modelName: "iPhone 17 Pro",
        barcode: "1234567890123",
      }),
    ).toEqual({
      variantId: "variant-1",
      productId: "product-1",
      brandName: "Apple",
      modelName: "iPhone 17 Pro",
    });
    expect(
      findReceiptVariantForCatalogInput(products, {
        brandName: "Samsung",
        modelName: "iPhone 17 Pro",
        barcode: "1234567890123",
      }),
    ).toBeUndefined();
    expect(
      receiptBarcodeConflictsWithCatalogSearch(products, {
        brandName: "Samsung",
        modelName: "Galaxy",
        barcode: "1234567890123",
      }),
    ).toBe(true);
  });

  it("validates receipt source description", () => {
    expect(validateReceiptSourceDescription("  ")).toMatch(/Mənbəni/);
    expect(
      validateReceiptSourceDescription("TechSupply LLC, idxal — Çin"),
    ).toBeNull();
  });

  it("validates intake fields without category", () => {
    expect(
      validateReceiptIntakeFields({
        brandName: "Samsung",
        modelName: "Galaxy S26",
        barcode: "998877665544",
      }),
    ).toBeNull();
    expect(
      validateReceiptIntakeFields({
        brandName: "Samsung",
        modelName: "Galaxy S26",
        barcode: "",
      }),
    ).toBeNull();
    expect(
      validateReceiptIntakeFields({
        brandName: "",
        modelName: "Galaxy S26",
        barcode: "998877665544",
      }),
    ).toBe("Brend daxil edin.");
  });

  it("omits empty intake barcode from receipt payload", () => {
    expect(
      buildReceiptRequestBody({
        variantId: "",
        intakeMode: true,
        brandName: "Samsung",
        modelName: "Galaxy S26",
        barcode: "  ",
        locationId: "loc-1",
        quantity: 2,
        sourceType: "TechSupply",
        sourceDocumentId: "GRN-001",
        reason: "İlk qəbul",
      }),
    ).toEqual({
      intakeBrandName: "Samsung",
      intakeModelName: "Galaxy S26",
      locationId: "loc-1",
      quantity: 2,
      sourceType: "TechSupply",
      sourceDocumentId: "GRN-001",
      reason: "İlk qəbul",
    });
  });

  it("includes intake required specs when provided", () => {
    expect(
      buildReceiptRequestBody({
        variantId: "",
        intakeMode: true,
        brandName: "Apple",
        modelName: "iPhone 17 Pro",
        barcode: "9988776655441",
        locationId: "loc-1",
        quantity: 1,
        sourceType: "TechSupply",
        sourceDocumentId: "GRN-002",
        reason: "Yeni variant",
        intakeRequiredSpecs: [{ label: "Rəng", value: "Qara" }],
        intakeVariantSku: "APPLE-IPHO-BLK",
      }),
    ).toMatchObject({
      intakeRequiredSpecs: [{ label: "Rəng", value: "Qara" }],
      intakeVariantSku: "APPLE-IPHO-BLK",
    });
  });

  it("shows required specs whenever intake mode is active", () => {
    expect(
      shouldCollectReceiptIntakeRequiredSpecs({
        intakeMode: true,
      }),
    ).toBe(true);
    expect(
      shouldCollectReceiptIntakeRequiredSpecs({
        intakeMode: false,
      }),
    ).toBe(false);
  });
});
