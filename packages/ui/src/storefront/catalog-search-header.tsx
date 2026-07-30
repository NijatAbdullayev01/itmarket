import Link from "next/link";

import { formatChromeMessage } from "./chrome-copy";
import { IconChevronDown, IconSort } from "./icons";

export type CatalogSearchHeaderCopy = {
  resultsTitle: string;
  queryResultsTitle: string;
  productCount: string;
  sortLabel: string;
  sortNewest: string;
  sortName: string;
  sortPrice: string;
};

export const defaultCatalogSearchHeaderCopy: CatalogSearchHeaderCopy = {
  resultsTitle: "Axtarış nəticələri",
  queryResultsTitle: "\u201C{query}\u201D üzrə axtarış nəticələri",
  productCount: "({count} məhsul)",
  sortLabel: "Çeşidləmə",
  sortNewest: "Ən yeni",
  sortName: "Ada görə",
  sortPrice: "Qiymətə görə",
};

export type CatalogSortOption = "newest" | "name" | "price";

export type CatalogHrefFilters = {
  q?: string;
  category?: string;
  brand?: string;
  sort?: CatalogSortOption;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  color?: string;
  ram?: string;
  storage?: string;
  page?: number;
};

type CatalogSearchHeaderProps = CatalogHrefFilters & {
  categoryName?: string;
  brandName?: string;
  resultCount: number;
  copy?: Partial<CatalogSearchHeaderCopy>;
};

export function buildCatalogHref(filters: CatalogHrefFilters) {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.minPrice !== undefined) {
    params.set("minPrice", String(filters.minPrice));
  }
  if (filters.maxPrice !== undefined) {
    params.set("maxPrice", String(filters.maxPrice));
  }
  if (filters.inStock) params.set("inStock", "1");
  if (filters.onSale) params.set("onSale", "1");
  if (filters.color?.trim()) params.set("color", filters.color.trim());
  if (filters.ram?.trim()) params.set("ram", filters.ram.trim());
  if (filters.storage?.trim()) params.set("storage", filters.storage.trim());
  if (filters.sort && filters.sort !== "newest") {
    params.set("sort", filters.sort);
  }
  if (filters.page !== undefined && filters.page > 1) {
    params.set("page", String(filters.page));
  }

  const categorySlug = filters.category?.trim();
  const brandSlug = filters.brand?.trim();

  if (categorySlug) {
    // Brand is a facet on category landings (path already encodes category).
    if (brandSlug) {
      params.set("brand", brandSlug);
    }
    const query = params.toString();
    const path = `/categories/${encodeURIComponent(categorySlug)}`;
    return query ? `${path}?${query}` : path;
  }

  if (brandSlug) {
    const query = params.toString();
    const path = `/brands/${encodeURIComponent(brandSlug)}`;
    return query ? `${path}?${query}` : path;
  }

  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function normalizeCatalogFilterText(value: string) {
  return value.trim().toLocaleLowerCase("az");
}

/** Exact brand name/slug match for a free-text catalog query. */
export function matchCatalogBrandByQuery<T extends { name: string; slug: string }>(
  query: string | undefined,
  brands: readonly T[],
): T | undefined {
  const normalized = query ? normalizeCatalogFilterText(query) : "";
  if (!normalized) {
    return undefined;
  }
  return brands.find(
    (brand) =>
      normalizeCatalogFilterText(brand.slug) === normalized ||
      normalizeCatalogFilterText(brand.name) === normalized,
  );
}

/** Match a catalog slug against brands (e.g. boutique category "apple"). */
export function matchCatalogBrandBySlug<T extends { slug: string }>(
  slug: string | undefined,
  brands: readonly T[],
): T | undefined {
  const normalized = slug ? normalizeCatalogFilterText(slug) : "";
  if (!normalized) {
    return undefined;
  }
  return brands.find(
    (brand) => normalizeCatalogFilterText(brand.slug) === normalized,
  );
}

/**
 * Category-tree nav href: when the slug is also a brand (Apple boutique),
 * open the brand facet so the filter panel shows Brend as selected.
 */
export function resolveCatalogNavHref(
  slug: string | undefined,
  brands: readonly { slug: string }[] = [],
): string {
  if (slug === undefined || slug.trim() === "") {
    return "/";
  }
  const matchedBrand = matchCatalogBrandBySlug(slug, brands);
  if (matchedBrand) {
    return `/brands/${encodeURIComponent(matchedBrand.slug)}`;
  }
  return buildCatalogHref({ category: slug });
}

export function catalogQueryMatchesBrand(
  query: string | undefined,
  brandSlug: string | undefined,
  brands: readonly { name: string; slug: string }[],
): boolean {
  if (!query?.trim() || !brandSlug) {
    return false;
  }
  return matchCatalogBrandByQuery(query, brands)?.slug === brandSlug;
}

function resolveTitle({
  q,
  categoryName,
  brandName,
  copy,
}: Pick<CatalogSearchHeaderProps, "q" | "categoryName" | "brandName"> & {
  copy: CatalogSearchHeaderCopy;
}) {
  const query = q?.trim();
  if (query) {
    return formatChromeMessage(copy.queryResultsTitle, { query });
  }
  if (categoryName && brandName) {
    return `${brandName} \u00B7 ${categoryName}`;
  }
  if (categoryName) return categoryName;
  if (brandName) return brandName;
  return copy.resultsTitle;
}

export function CatalogSearchHeader({
  q,
  category,
  categoryName,
  brand,
  brandName,
  sort = "newest",
  minPrice,
  maxPrice,
  inStock,
  onSale,
  color,
  ram,
  storage,
  resultCount,
  copy: copyProp,
}: CatalogSearchHeaderProps) {
  const copy = { ...defaultCatalogSearchHeaderCopy, ...copyProp };
  const title = resolveTitle({ q, categoryName, brandName, copy });
  const countLabel = formatChromeMessage(copy.productCount, { count: resultCount });
  const sortOptions: { value: CatalogSortOption; label: string }[] = [
    { value: "newest", label: copy.sortNewest },
    { value: "name", label: copy.sortName },
    { value: "price", label: copy.sortPrice },
  ];
  const hrefBase: CatalogHrefFilters = {
    q,
    category,
    brand,
    minPrice,
    maxPrice,
    inStock,
    onSale,
    color,
    ram,
    storage,
  };

  return (
    <header className="ui-catalog-search-header">
      <div className="ui-catalog-search-header__row">
        <div className="ui-catalog-search-header__heading">
          <h1 className="ui-catalog-search-header__title">
            <span className="ui-catalog-search-header__title-text">{title}</span>
          </h1>
          <p className="ui-catalog-search-header__count">{countLabel}</p>
        </div>

        <details className="ui-catalog-sort">
          <summary
            className="ui-catalog-sort__trigger"
            aria-label={copy.sortLabel}
          >
            <IconSort width={18} height={18} aria-hidden="true" />
            <span className="ui-catalog-sort__label">{copy.sortLabel}</span>
            <IconChevronDown
              className="ui-catalog-sort__chevron"
              width={16}
              height={16}
              aria-hidden="true"
            />
          </summary>
          <div className="ui-catalog-sort__menu" role="menu" aria-label={copy.sortLabel}>
            {sortOptions.map((option) => {
              const href = buildCatalogHref({ ...hrefBase, sort: option.value });
              const isActive = sort === option.value;
              return (
                <Link
                  key={option.value}
                  href={href}
                  className={
                    isActive
                      ? "ui-catalog-sort__option ui-catalog-sort__option--active"
                      : "ui-catalog-sort__option"
                  }
                  role="menuitem"
                  aria-current={isActive ? "true" : undefined}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </details>
      </div>
    </header>
  );
}
