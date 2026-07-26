import { describe, expect, it } from "vitest";

import {
  formatPosReturnSaleProductPreview,
  formatPosReturnSaleSkuPreview,
  posReturnSaleDocumentLabel,
  posReturnSaleMatchesSearch,
} from "./pos-return-sale-search";

const sale = {
  channel: "CASH",
  externalTerminalReference: "KQ-20260724-001",
  items: [
    {
      productName: "iPhone 15",
      variantName: "128GB Black",
      sku: "APP-IP15-128-BLK",
      barcode: "8600123456789",
    },
    {
      productName: "AirPods Pro",
      variantName: "USB-C",
      sku: "APP-APP-USBC",
      barcode: null,
    },
  ],
};

const transferSale = {
  channel: "TRANSFER",
  externalTerminalReference: "HF-998877",
  items: sale.items,
};

describe("posReturnSaleMatchesSearch", () => {
  it("matches empty query", () => {
    expect(posReturnSaleMatchesSearch(sale, "  ")).toBe(true);
  });

  it("does not match internal sale numbers", () => {
    expect(posReturnSaleMatchesSearch(sale, "POS-20260724")).toBe(false);
    expect(posReturnSaleMatchesSearch(sale, "D6F1034C")).toBe(false);
  });

  it("matches product name, variant, SKU and barcode", () => {
    expect(posReturnSaleMatchesSearch(sale, "iphone")).toBe(true);
    expect(posReturnSaleMatchesSearch(sale, "usb-c")).toBe(true);
    expect(posReturnSaleMatchesSearch(sale, "128GB")).toBe(true);
    expect(posReturnSaleMatchesSearch(sale, "APP-IP15")).toBe(true);
    expect(posReturnSaleMatchesSearch(sale, "8600123456789")).toBe(true);
  });

  it("matches kassa qəbzi and hesab faktura numbers", () => {
    expect(posReturnSaleMatchesSearch(sale, "KQ-20260724")).toBe(true);
    expect(posReturnSaleMatchesSearch(sale, "001")).toBe(true);
    expect(posReturnSaleMatchesSearch(transferSale, "HF-998877")).toBe(true);
    expect(posReturnSaleMatchesSearch(transferSale, "998877")).toBe(true);
  });

  it("rejects unknown query", () => {
    expect(posReturnSaleMatchesSearch(sale, "samsung")).toBe(false);
  });

  it("handles sales without items or document ref", () => {
    expect(posReturnSaleMatchesSearch({}, "iphone")).toBe(false);
    expect(posReturnSaleMatchesSearch({ items: [] }, "iphone")).toBe(false);
    expect(
      posReturnSaleMatchesSearch(
        { externalTerminalReference: null, items: [] },
        "KQ-1",
      ),
    ).toBe(false);
  });
});

describe("posReturnSaleDocumentLabel", () => {
  it("labels transfer as hesab faktura and others as kassa qəbzi", () => {
    expect(posReturnSaleDocumentLabel("TRANSFER")).toBe("Hesab faktura");
    expect(posReturnSaleDocumentLabel("CASH")).toBe("Kassa qəbzi");
    expect(posReturnSaleDocumentLabel("CARD")).toBe("Kassa qəbzi");
    expect(posReturnSaleDocumentLabel(undefined)).toBe("Kassa qəbzi");
  });
});

describe("formatPosReturnSaleProductPreview", () => {
  it("joins first names and counts extras", () => {
    expect(formatPosReturnSaleProductPreview(sale.items, 1)).toBe(
      "iPhone 15 · 128GB Black +1",
    );
    expect(formatPosReturnSaleProductPreview(sale.items, 2)).toBe(
      "iPhone 15 · 128GB Black, AirPods Pro · USB-C",
    );
  });

  it("returns empty for missing items", () => {
    expect(formatPosReturnSaleProductPreview(undefined)).toBe("");
    expect(formatPosReturnSaleProductPreview([])).toBe("");
  });
});

describe("formatPosReturnSaleSkuPreview", () => {
  it("shows first SKU and counts extras", () => {
    expect(formatPosReturnSaleSkuPreview(sale.items)).toBe(
      "APP-IP15-128-BLK +1",
    );
    expect(formatPosReturnSaleSkuPreview(sale.items, 2)).toBe(
      "APP-IP15-128-BLK, APP-APP-USBC",
    );
  });

  it("returns empty for missing items", () => {
    expect(formatPosReturnSaleSkuPreview(undefined)).toBe("");
    expect(formatPosReturnSaleSkuPreview([])).toBe("");
  });
});
