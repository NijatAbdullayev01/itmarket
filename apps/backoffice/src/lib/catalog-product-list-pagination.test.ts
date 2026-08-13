import { describe, expect, it } from "vitest";
import {
  CATALOG_PRODUCTS_PAGE_SIZE,
  catalogProductListPageCount,
  catalogProductListPageRange,
  clampCatalogProductListPage,
  sliceCatalogProductListPage,
  visibleCatalogProductListPages,
} from "./catalog-product-list-pagination";

describe("catalog-product-list-pagination", () => {
  it("uses 10 items per page", () => {
    expect(CATALOG_PRODUCTS_PAGE_SIZE).toBe(10);
  });

  it("counts a single page for 10 or fewer items", () => {
    expect(catalogProductListPageCount(0)).toBe(1);
    expect(catalogProductListPageCount(10)).toBe(1);
  });

  it("opens a second page at 11 items", () => {
    expect(catalogProductListPageCount(11)).toBe(2);
    expect(catalogProductListPageCount(25)).toBe(3);
  });

  it("clamps the page when the list shrinks or the value is invalid", () => {
    expect(clampCatalogProductListPage(5, 25)).toBe(3);
    expect(clampCatalogProductListPage(0, 25)).toBe(1);
    expect(clampCatalogProductListPage(1.9, 25)).toBe(1);
    expect(clampCatalogProductListPage(Number.NaN, 25)).toBe(1);
  });

  it("slices the current page of items", () => {
    const items = Array.from({ length: 25 }, (_, index) => index + 1);
    expect(sliceCatalogProductListPage(items, 1)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(sliceCatalogProductListPage(items, 3)).toEqual([21, 22, 23, 24, 25]);
    expect(sliceCatalogProductListPage(items, 9)).toEqual([21, 22, 23, 24, 25]);
  });

  it("reports a 1-based inclusive range for the status text", () => {
    expect(catalogProductListPageRange(1, 25)).toEqual({ start: 1, end: 10 });
    expect(catalogProductListPageRange(3, 25)).toEqual({ start: 21, end: 25 });
    expect(catalogProductListPageRange(1, 0)).toEqual({ start: 0, end: 0 });
  });

  it("shows every page number when there are at most 7 pages", () => {
    expect(visibleCatalogProductListPages(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(visibleCatalogProductListPages(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("keeps a sliding window with first and last pages for longer lists", () => {
    expect(visibleCatalogProductListPages(1, 12)).toEqual([1, 2, 3, 4, 12]);
    expect(visibleCatalogProductListPages(6, 12)).toEqual([1, 5, 6, 7, 12]);
    expect(visibleCatalogProductListPages(12, 12)).toEqual([1, 9, 10, 11, 12]);
  });
});
