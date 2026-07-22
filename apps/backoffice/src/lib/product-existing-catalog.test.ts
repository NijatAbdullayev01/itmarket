import { describe, expect, it } from "vitest";

import {
  buildVariantAttributesFromRequiredSpecs,
  buildVariantNameFromRequiredSpecs,
  buildProductSlugFromCatalogFields,
  buildVariantSkuFromCatalogFields,
  extractColorFromRequiredSpecs,
  extractVariantStorageFromRequiredSpecs,
  findActiveProductBySlug,
  findExistingProductForCreateForm,
  isMemoryStorageSpecLabel,
  isVariantSkuTaken,
  parseProductRequiredSpecs,
  requiredSpecsEntriesEqual,
  requiredSpecsMatchExceptMemoryStorage,
  resolveCategorySelection,
} from "./product-existing-catalog";

describe("parseProductRequiredSpecs", () => {
  it("parses valid entries and skips invalid rows", () => {
    expect(
      parseProductRequiredSpecs([
        { label: "RAM", value: "16 GB" },
        { label: "", value: "512 GB" },
        { label: "Rəng", value: "" },
        null,
      ]),
    ).toEqual([{ label: "RAM", value: "16 GB" }]);
  });
});

describe("resolveCategorySelection", () => {
  it("maps root and child categories", () => {
    const categories = [
      { id: "root", parentId: null },
      { id: "child", parentId: "root" },
    ];

    expect(resolveCategorySelection("root", categories)).toEqual({
      parentCategoryId: "root",
      subcategoryId: "",
    });
    expect(resolveCategorySelection("child", categories)).toEqual({
      parentCategoryId: "root",
      subcategoryId: "child",
    });
  });
});

describe("requiredSpecsMatchExceptMemoryStorage", () => {
  it("ignores memory-related label value differences", () => {
    const baseline = [
      { label: "Rəng", value: "Space Gray" },
      { label: "Müvəqqəti yaddaş", value: "8 GB" },
      { label: "Daimi yaddaş", value: "256 GB SSD" },
    ];
    const candidate = [
      { label: "Rəng", value: "Space Gray" },
      { label: "Müvəqqəti yaddaş", value: "16 GB" },
      { label: "Daimi yaddaş", value: "512 GB SSD" },
    ];

    expect(requiredSpecsMatchExceptMemoryStorage(baseline, candidate)).toBe(true);
  });

  it("fails when a non-memory spec differs", () => {
    const baseline = [{ label: "Rəng", value: "Space Gray" }];
    const candidate = [{ label: "Rəng", value: "Silver" }];

    expect(requiredSpecsMatchExceptMemoryStorage(baseline, candidate)).toBe(false);
  });
});

describe("isMemoryStorageSpecLabel", () => {
  it("detects RAM and permanent storage labels", () => {
    expect(isMemoryStorageSpecLabel("Müvəqqəti yaddaş")).toBe(true);
    expect(isMemoryStorageSpecLabel("Daimi yaddaş")).toBe(true);
    expect(isMemoryStorageSpecLabel("Rəng")).toBe(false);
  });
});

describe("variant extraction", () => {
  it("maps required specs to variant attributes", () => {
    const entries = [
      { label: "Daimi yaddaş", value: "512 GB SSD" },
      { label: "Müvəqqəti yaddaş", value: "16 GB" },
    ];

    expect(extractVariantStorageFromRequiredSpecs(entries)).toEqual({
      permanentStorage: "512 GB SSD",
      operationalMemory: "16 GB",
    });
    expect(buildVariantAttributesFromRequiredSpecs(entries)).toEqual({
      Yaddaş: "512 GB SSD",
      RAM: "16 GB",
    });
    expect(
      buildVariantAttributesFromRequiredSpecs([
        { label: "Rəng", value: "Titan Qara" },
        { label: "Daimi yaddaş", value: "256 GB" },
        { label: "Müvəqqəti yaddaş", value: "12 GB" },
      ]),
    ).toEqual({
      Rəng: "Titan Qara",
      Yaddaş: "256 GB",
      RAM: "12 GB",
    });
    expect(buildVariantNameFromRequiredSpecs(entries)).toBe("512 GB SSD / 16 GB");
  });

  it("extracts color from required specs", () => {
    expect(
      extractColorFromRequiredSpecs([
        { label: "Rəng", value: "Titan Qara" },
        { label: "Daimi yaddaş", value: "256 GB" },
      ]),
    ).toBe("Titan Qara");
  });

  it("builds product slug from brand and model", () => {
    expect(
      buildProductSlugFromCatalogFields({
        brandName: "Apple",
        modelName: "MacBook Air 13",
      }),
    ).toBe("apple-macbook-air-13");
  });

  it("builds product slug from model when brand is missing", () => {
    expect(
      buildProductSlugFromCatalogFields({
        brandName: "",
        modelName: "ThinkPad X1 Carbon",
      }),
    ).toBe("thinkpad-x1-carbon");
  });

  it("builds SKU from brand, model, and memory specs", () => {
    expect(
      buildVariantSkuFromCatalogFields({
        brandName: "Lenovo",
        modelName: "ThinkPad X1 Carbon",
        requiredSpecEntries: [
          { label: "Daimi yaddaş", value: "512 GB SSD" },
          { label: "Müvəqqəti yaddaş", value: "32 GB" },
        ],
      }),
    ).toBe("LEN-TPX1C-512G-32G");
  });

  it("includes color in SKU when Rəng spec is set", () => {
    expect(
      buildVariantSkuFromCatalogFields({
        brandName: "Apple",
        modelName: "iPhone 17 Pro",
        requiredSpecEntries: [
          { label: "Rəng", value: "Titan Qara" },
          { label: "Daimi yaddaş", value: "256GB" },
          { label: "Müvəqqəti yaddaş", value: "12 GB" },
        ],
      }),
    ).toBe("APP-IP17P-TQ-256G-12G");
  });

  it("uses Azerbaijani color abbreviations in SKU", () => {
    expect(
      buildVariantSkuFromCatalogFields({
        brandName: "Apple",
        modelName: "iPhone Air",
        requiredSpecEntries: [
          { label: "Rəng", value: "Qara" },
          { label: "Daimi yaddaş", value: "256GB" },
        ],
      }),
    ).toBe("APP-IPA-QRA-256G");

    expect(
      buildVariantSkuFromCatalogFields({
        brandName: "Apple",
        modelName: "iPhone Air",
        requiredSpecEntries: [
          { label: "Rəng", value: "Ağ" },
          { label: "Daimi yaddaş", value: "256GB" },
        ],
      }),
    ).toBe("APP-IPA-AG-256G");

    expect(
      buildVariantSkuFromCatalogFields({
        brandName: "Apple",
        modelName: "iPhone Air",
        requiredSpecEntries: [{ label: "Rəng", value: "Gümüşü" }],
      }),
    ).toBe("APP-IPA-GMS");
  });

  it("uses G and T from compact user values", () => {
    expect(
      buildVariantSkuFromCatalogFields({
        brandName: "Apple",
        modelName: "iPhone 17 Pro",
        requiredSpecEntries: [
          { label: "Daimi yaddaş", value: "256GB" },
          { label: "Müvəqqəti yaddaş", value: "32GB" },
        ],
      }),
    ).toBe("APP-IP17P-256G-32G");
  });

  it("abbreviates multi-word brands and terabyte storage", () => {
    expect(
      buildVariantSkuFromCatalogFields({
        brandName: "Apple Inc",
        modelName: "MacBook Pro 16",
        requiredSpecEntries: [
          { label: "Daimi yaddaş", value: "1 TB SSD" },
          { label: "Müvəqqəti yaddaş", value: "16 GB" },
        ],
      }),
    ).toBe("AI-MBP16-1T-16G");
  });

  it("includes meter length in SKU when Metr spec is set", () => {
    expect(
      buildVariantSkuFromCatalogFields({
        brandName: "Ugreen",
        modelName: "HDMI Cable",
        requiredSpecEntries: [{ label: "Metr", value: "3 metr" }],
      }),
    ).toBe("UGR-HDMC-3M");

    expect(
      buildVariantSkuFromCatalogFields({
        brandName: "Ugreen",
        modelName: "HDMI Cable",
        requiredSpecEntries: [
          { label: "Rəng", value: "Qara" },
          { label: "Metr", value: "5" },
        ],
      }),
    ).toBe("UGR-HDMC-QRA-5M");
  });

  it("includes port, PoE and transfer speed in SKU for network products", () => {
    expect(
      buildVariantSkuFromCatalogFields({
        brandName: "TP-Link",
        modelName: "TL-SG2428P",
        requiredSpecEntries: [
          { label: "Port", value: "24" },
          { label: "PoE+", value: "16" },
          { label: "Sürət", value: "1 Gbps" },
        ],
      }),
    ).toBe("TPL-TLSG-24P-16E-1G");

    expect(
      buildVariantAttributesFromRequiredSpecs([
        { label: "Port", value: "48" },
        { label: "PoE+", value: "24" },
        { label: "Sürət", value: "10 Gbps" },
      ]),
    ).toEqual({
      "Port sayı": "48",
      "PoE sayı": "24",
      "Ötürmə sürəti": "10 Gbps",
    });

    expect(
      buildVariantNameFromRequiredSpecs([
        { label: "Port", value: "24" },
        { label: "PoE+", value: "16" },
        { label: "Sürət", value: "1 Gbps" },
      ]),
    ).toBe("24 port / 16 PoE / 1 Gbps");
  });
});

describe("requiredSpecsEntriesEqual", () => {
  it("compares normalized label maps", () => {
    expect(
      requiredSpecsEntriesEqual(
        [{ label: "RAM", value: "16 GB" }],
        [{ label: "ram", value: "16 GB" }],
      ),
    ).toBe(true);
  });
});

describe("catalog uniqueness helpers", () => {
  const products = [
    {
      id: "p1",
      slug: "thinkpad-x1",
      status: "ACTIVE" as const,
      variants: [{ sku: "LEN-TPX1-512G-16G" }],
    },
    {
      id: "p2",
      slug: "archived-phone",
      status: "ARCHIVED" as const,
      variants: [],
    },
  ];

  it("finds existing product by slug when model name differs", () => {
    const catalogProducts = [
      {
        id: "p1",
        name: "Apple iPhone 17 Pro",
        slug: "apple-iphone-17-pro",
        status: "ACTIVE" as const,
      },
    ];

    expect(
      findExistingProductForCreateForm(catalogProducts, {
        modelName: "iPhone 17 Pro",
        productSlug: "apple-iphone-17-pro",
      })?.id,
    ).toBe("p1");
  });

  it("prefers exact model name match over slug", () => {
    const catalogProducts = [
      {
        id: "by-name",
        name: "ThinkPad X1",
        slug: "lenovo-thinkpad-x1",
        status: "ACTIVE" as const,
      },
      {
        id: "by-slug",
        name: "Other",
        slug: "lenovo-thinkpad-x1",
        status: "ACTIVE" as const,
      },
    ];

    expect(
      findExistingProductForCreateForm(catalogProducts, {
        modelName: "ThinkPad X1",
        productSlug: "lenovo-thinkpad-x1",
      })?.id,
    ).toBe("by-name");
  });

  it("finds active slug conflicts and ignores archived products", () => {
    expect(findActiveProductBySlug(products, "thinkpad-x1")?.id).toBe("p1");
    expect(findActiveProductBySlug(products, "archived-phone")).toBeUndefined();
    expect(findActiveProductBySlug(products, "thinkpad-x1", "p1")).toBeUndefined();
  });

  it("detects duplicate variant SKUs case-insensitively", () => {
    expect(isVariantSkuTaken(products, "len-tpx1-512g-16g")).toBe(true);
    expect(isVariantSkuTaken(products, "NEW-SKU")).toBe(false);
  });

  it("allows reusing an archived SKU on the same product", () => {
    const catalog = [
      {
        id: "phone",
        variants: [{ sku: "APP-IP17P-256G-12G", status: "ARCHIVED" as const }],
      },
    ];
    expect(
      isVariantSkuTaken(catalog, "APP-IP17P-256G-12G", {
        forProductId: "phone",
      }),
    ).toBe(false);
    expect(isVariantSkuTaken(catalog, "APP-IP17P-256G-12G")).toBe(true);
  });
});
