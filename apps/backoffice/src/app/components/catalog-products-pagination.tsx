"use client";

import {
  CATALOG_PRODUCTS_PAGE_SIZE,
  catalogProductListPageRange,
  visibleCatalogProductListPages,
} from "../../lib/catalog-product-list-pagination";

export function CatalogProductsPagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems <= CATALOG_PRODUCTS_PAGE_SIZE || totalPages <= 1) {
    return null;
  }

  const pages = visibleCatalogProductListPages(page, totalPages);
  const range = catalogProductListPageRange(page, totalItems);

  return (
    <nav
      className="catalog-products-pagination"
      aria-label="Məhsul siyahısı səhifələmə"
    >
      <p className="catalog-products-pagination__status" aria-live="polite">
        {range.start}–{range.end} / {totalItems}
      </p>
      <ul className="catalog-products-pagination__pages">
        {pages.map((entry, index) => {
          const previous = pages[index - 1];
          const showEllipsis = previous !== undefined && entry - previous > 1;
          const isCurrent = entry === page;

          return (
            <li key={entry} className="catalog-products-pagination__item">
              {showEllipsis ? (
                <span
                  className="catalog-products-pagination__ellipsis"
                  aria-hidden="true"
                >
                  …
                </span>
              ) : null}
              {isCurrent ? (
                <span
                  className="catalog-products-pagination__page catalog-products-pagination__page--current"
                  aria-current="page"
                >
                  {entry}
                </span>
              ) : (
                <button
                  type="button"
                  className="bo-btn-reset catalog-products-pagination__page"
                  aria-label={`Səhifə ${entry}`}
                  onClick={() => onPageChange(entry)}
                >
                  {entry}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
