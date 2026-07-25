import Link from "next/link";

import { IconChevronDown, IconSort } from "./icons";

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
};

type CatalogSearchHeaderProps = CatalogHrefFilters & {
  categoryName?: string;
  brandName?: string;
  resultCount: number;
};

const SORT_OPTIONS: { value: CatalogSortOption; label: string }[] = [
  { value: "newest", label: "Ən yeni" },
  { value: "name", label: "Ada görə" },
  { value: "price", label: "Qiymətə görə" },
];

export function buildCatalogHref(filters: CatalogHrefFilters) {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.category) params.set("category", filters.category);
  if (filters.brand) params.set("brand", filters.brand);
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
    return buildCatalogHref({ brand: matchedBrand.slug });
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
}: Pick<CatalogSearchHeaderProps, "q" | "categoryName" | "brandName">) {
  const query = q?.trim();
  if (query) {
    return `“${query}” üzrə axtarış nəticələri`;
  }
  if (categoryName && brandName) {
    return `${brandName} · ${categoryName}`;
  }
  if (categoryName) return categoryName;
  if (brandName) return brandName;
  return "Axtarış nəticələri";
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
}: CatalogSearchHeaderProps) {
  const title = resolveTitle({ q, categoryName, brandName });
  const countLabel = `${resultCount} məhsul`;
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
        <h1 className="ui-catalog-search-header__title">
          <span className="ui-catalog-search-header__title-text">{title}</span>
          <span className="ui-catalog-search-header__count">({countLabel})</span>
        </h1>

        <details className="ui-catalog-sort">
          <summary
            className="ui-catalog-sort__trigger"
            aria-label="Çeşidləmə"
          >
            <IconSort width={18} height={18} aria-hidden="true" />
            <span className="ui-catalog-sort__label">Çeşidləmə</span>
            <IconChevronDown
              className="ui-catalog-sort__chevron"
              width={16}
              height={16}
              aria-hidden="true"
            />
          </summary>
          <div className="ui-catalog-sort__menu" role="menu" aria-label="Çeşidləmə">
            {SORT_OPTIONS.map((option) => {
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
