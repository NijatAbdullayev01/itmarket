import Link from "next/link";

import { IconChevronLeft, IconChevronRight } from "./icons";

export type CatalogPaginationCopy = {
  nav: string;
  previous: string;
  previousPage: string;
  next: string;
  nextPage: string;
};

export const defaultCatalogPaginationCopy: CatalogPaginationCopy = {
  nav: "S\u0259hif\u0259l\u0259m\u0259",
  previous: "\u018Fvv\u0259lki",
  previousPage: "\u018Fvv\u0259lki s\u0259hif\u0259",
  next: "N\u00F6vb\u0259ti",
  nextPage: "N\u00F6vb\u0259ti s\u0259hif\u0259",
};

export type CatalogPaginationProps = {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  copy?: Partial<CatalogPaginationCopy>;
};

function visiblePages(page: number, totalPages: number): number[] {
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
  return [...pages].filter((value) => value >= 1 && value <= totalPages).sort(
    (left, right) => left - right,
  );
}

export function CatalogPagination({
  page,
  totalPages,
  buildHref,
  copy: copyProp,
}: CatalogPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const copy = { ...defaultCatalogPaginationCopy, ...copyProp };
  const pages = visiblePages(page, totalPages);

  return (
    <nav className="ui-catalog-pagination" aria-label={copy.nav}>
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          className="ui-catalog-pagination__nav"
          rel="prev"
          aria-label={copy.previousPage}
        >
          <IconChevronLeft width={18} height={18} aria-hidden="true" />
          <span>{copy.previous}</span>
        </Link>
      ) : (
        <span className="ui-catalog-pagination__nav ui-catalog-pagination__nav--disabled">
          <IconChevronLeft width={18} height={18} aria-hidden="true" />
          <span>{copy.previous}</span>
        </span>
      )}

      <ul className="ui-catalog-pagination__pages">
        {pages.map((entry, index) => {
          const previous = pages[index - 1];
          const showEllipsis = previous !== undefined && entry - previous > 1;
          return (
            <li key={entry} className="ui-catalog-pagination__item">
              {showEllipsis ? (
                <span className="ui-catalog-pagination__ellipsis" aria-hidden="true">
                  {"\u2026"}
                </span>
              ) : null}
              {entry === page ? (
                <span
                  className="ui-catalog-pagination__page ui-catalog-pagination__page--current"
                  aria-current="page"
                >
                  {entry}
                </span>
              ) : (
                <Link
                  href={buildHref(entry)}
                  className="ui-catalog-pagination__page"
                >
                  {entry}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {page < totalPages ? (
        <Link
          href={buildHref(page + 1)}
          className="ui-catalog-pagination__nav"
          rel="next"
          aria-label={copy.nextPage}
        >
          <span>{copy.next}</span>
          <IconChevronRight width={18} height={18} aria-hidden="true" />
        </Link>
      ) : (
        <span className="ui-catalog-pagination__nav ui-catalog-pagination__nav--disabled">
          <span>{copy.next}</span>
          <IconChevronRight width={18} height={18} aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}
