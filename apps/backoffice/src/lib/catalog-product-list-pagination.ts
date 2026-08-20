export const CATALOG_PRODUCTS_PAGE_SIZE = 10;

/** Admin cədvəl panelləri (müştərilər, sorğular, rəylər və s.) üçun səhifə
 * ölçüsü. Cədvəl sətirlərinin eyni anda DOM-a yüklənməsinin qarşısını
 * alaraq brauzerin donmasının qarşını alır. */
export const ADMIN_TABLE_PAGE_SIZE = 25;

export function catalogProductListPageCount(
  totalItems: number,
  pageSize: number = CATALOG_PRODUCTS_PAGE_SIZE,
): number {
  if (totalItems <= 0 || pageSize <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function clampCatalogProductListPage(
  page: number,
  totalItems: number,
  pageSize: number = CATALOG_PRODUCTS_PAGE_SIZE,
): number {
  const totalPages = catalogProductListPageCount(totalItems, pageSize);
  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }
  return Math.min(Math.trunc(page), totalPages);
}

export function sliceCatalogProductListPage<T>(
  items: readonly T[],
  page: number,
  pageSize: number = CATALOG_PRODUCTS_PAGE_SIZE,
): T[] {
  const safePage = clampCatalogProductListPage(page, items.length, pageSize);
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function catalogProductListPageRange(
  page: number,
  totalItems: number,
  pageSize: number = CATALOG_PRODUCTS_PAGE_SIZE,
): { start: number; end: number } {
  if (totalItems <= 0) {
    return { start: 0, end: 0 };
  }
  const safePage = clampCatalogProductListPage(page, totalItems, pageSize);
  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);
  return { start, end };
}

/** Sliding window of numbered pages: 1 … 4 5 6 … 12 */
export function visibleCatalogProductListPages(
  page: number,
  totalPages: number,
): number[] {
  if (totalPages <= 1) {
    return totalPages === 1 ? [1] : [];
  }
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  if (page <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (page >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  return [...pages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((left, right) => left - right);
}
