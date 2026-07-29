"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

import { CatalogFilterPanel } from "./catalog-filter-panel";
import { IconClose, IconSliders } from "./icons";
import {
  buildCatalogHref,
  catalogQueryMatchesBrand,
  type CatalogHrefFilters,
} from "./catalog-search-header";
import type { CategoryItem } from "./category-items";

/** Matches catalog mobile layout breakpoint in components.css */
const CATALOG_MOBILE_MQ = "(max-width: 768px)";

export type CatalogFiltersCopy = {
  filtersTitle: string;
  filtersToggle: string;
  activeFilters: string;
  clearFilters: string;
  clearAllFilters: string;
  removeFilterAria: string;
  inStock: string;
  onSale: string;
  allCategories: string;
  apply: string;
  min: string;
  max: string;
  priceRange: string;
  priceChipRange: string;
  priceChipMin: string;
  priceChipMax: string;
  priceChipDefault: string;
  facetBrand: string;
  facetCategory: string;
  facetAvailability: string;
  facetStorage: string;
  facetRam: string;
  facetColor: string;
};

export const defaultCatalogFiltersCopy: CatalogFiltersCopy = {
  filtersTitle: "Filterl\u0259r",
  filtersToggle: "A\u00E7 / ba\u011Fla",
  activeFilters: "Aktiv filterl\u0259r",
  clearFilters: "T\u0259mizl\u0259",
  clearAllFilters: "Ham\u0131s\u0131n\u0131 t\u0259mizl\u0259",
  removeFilterAria: "{label} filterini sil",
  inStock: "Stokda var",
  onSale: "Endirimd\u0259",
  allCategories: "B\u00FCt\u00FCn kateqoriyalar",
  apply: "T\u0259tbiq et",
  min: "Min",
  max: "Max",
  priceRange: "Qiym\u0259t aral\u0131\u011F\u0131",
  priceChipRange: "{min} \u2013 {max} \u20BC",
  priceChipMin: "{min} \u20BC v\u0259 \u00E7ox",
  priceChipMax: "0 \u2013 {max} \u20BC",
  priceChipDefault: "Qiym\u0259t",
  facetBrand: "Brend",
  facetCategory: "Kateqoriya",
  facetAvailability: "M\u00F6vcudluq",
  facetStorage: "Yadda\u015F",
  facetRam: "RAM",
  facetColor: "R\u0259ng",
};

type CatalogFiltersProps = CatalogHrefFilters & {
  categories: CategoryItem[];
  brands: { id: string; name: string; slug: string }[];
  /** Landing copy shown above active filter chips. */
  intro?: ReactNode;
  children: ReactNode;
  copy?: Partial<CatalogFiltersCopy>;
};

function formatPriceChip(
  copy: CatalogFiltersCopy,
  minPrice?: number,
  maxPrice?: number,
) {
  if (minPrice !== undefined && maxPrice !== undefined) {
    return copy.priceChipRange
      .replace("{min}", String(minPrice))
      .replace("{max}", String(maxPrice));
  }
  if (minPrice !== undefined) {
    return copy.priceChipMin.replace("{min}", String(minPrice));
  }
  if (maxPrice !== undefined) {
    return copy.priceChipMax.replace("{max}", String(maxPrice));
  }
  return copy.priceChipDefault;
}

export function CatalogFilters({
  q,
  category,
  brand,
  sort = "newest",
  minPrice,
  maxPrice,
  inStock,
  onSale,
  color,
  ram,
  storage,
  categories,
  brands,
  intro,
  children,
  copy: copyProp,
}: CatalogFiltersProps) {
  const copy = { ...defaultCatalogFiltersCopy, ...copyProp };
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(CATALOG_MOBILE_MQ);
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // Desktop sidebar must stay visible; mobile starts collapsed.
  const filtersOpen = isMobile ? mobileOpen : true;

  const base: CatalogHrefFilters = {
    q,
    category,
    brand,
    sort,
    minPrice,
    maxPrice,
    inStock,
    onSale,
    color,
    ram,
    storage,
  };

  const categoryName = category
    ? (categories.find((entry) => entry.slug === category)?.name ?? category)
    : undefined;
  const brandName = brand
    ? (brands.find((entry) => entry.slug === brand)?.name ?? brand)
    : undefined;
  const qMatchesBrand = catalogQueryMatchesBrand(q, brand, brands);

  const activeFilters = [
    q?.trim() && !qMatchesBrand
      ? {
          key: "q",
          label: `\u201C${q.trim()}\u201D`,
          href: buildCatalogHref({ ...base, q: undefined }),
        }
      : null,
    category
      ? {
          key: "category",
          label: categoryName ?? category,
          href: buildCatalogHref({ ...base, category: undefined }),
        }
      : null,
    brand
      ? {
          key: "brand",
          label: brandName ?? brand,
          href: buildCatalogHref({
            ...base,
            brand: undefined,
            ...(qMatchesBrand ? { q: undefined } : {}),
          }),
        }
      : null,
    minPrice !== undefined || maxPrice !== undefined
      ? {
          key: "price",
          label: formatPriceChip(copy, minPrice, maxPrice),
          href: buildCatalogHref({
            ...base,
            minPrice: undefined,
            maxPrice: undefined,
          }),
        }
      : null,
    inStock
      ? {
          key: "inStock",
          label: copy.inStock,
          href: buildCatalogHref({ ...base, inStock: undefined }),
        }
      : null,
    onSale
      ? {
          key: "onSale",
          label: copy.onSale,
          href: buildCatalogHref({ ...base, onSale: undefined }),
        }
      : null,
    color
      ? {
          key: "color",
          label: color,
          href: buildCatalogHref({ ...base, color: undefined }),
        }
      : null,
    ram
      ? {
          key: "ram",
          label: `RAM ${ram}`,
          href: buildCatalogHref({ ...base, ram: undefined }),
        }
      : null,
    storage
      ? {
          key: "storage",
          label: `${copy.facetStorage} ${storage}`,
          href: buildCatalogHref({ ...base, storage: undefined }),
        }
      : null,
  ].filter(
    (entry): entry is { key: string; label: string; href: string } =>
      entry !== null,
  );

  const activeCount = activeFilters.length;
  const clearAllHref = "/";

  return (
    <div className="ui-catalog-layout">
      <aside className="ui-catalog-sidebar" aria-label={copy.filtersTitle}>
        <details className="ui-catalog-filters" open={filtersOpen}>
          <summary
            className="ui-catalog-filters__toggle"
            onClick={(event) => {
              event.preventDefault();
              if (!isMobile) return;
              setMobileOpen((prev) => !prev);
            }}
          >
            <span className="ui-catalog-filters__toggle-main">
              <IconSliders width={18} height={18} />
              <span>{copy.filtersTitle}</span>
              {activeCount > 0 ? (
                <span className="ui-catalog-filters__badge">{activeCount}</span>
              ) : null}
            </span>
            <span className="ui-catalog-filters__toggle-hint">{copy.filtersToggle}</span>
          </summary>

          <CatalogFilterPanel
            q={q}
            category={category}
            brand={brand}
            sort={sort}
            minPrice={minPrice}
            maxPrice={maxPrice}
            inStock={inStock}
            onSale={onSale}
            color={color}
            ram={ram}
            storage={storage}
            categories={categories}
            brands={brands}
            copy={copy}
          />
        </details>
      </aside>

      <div className="ui-catalog-main">
        {intro}
        {activeFilters.length > 0 ? (
          <div className="ui-filter-chips" aria-label={copy.activeFilters}>
            <Link
              className="ui-filter-chip ui-filter-chip--clear"
              href={clearAllHref}
            >
              {activeCount > 1 ? copy.clearAllFilters : copy.clearFilters}
            </Link>
            {activeFilters.map((filter) => (
              <Link
                key={filter.key}
                className="ui-filter-chip ui-filter-chip--active ui-filter-chip--dismiss"
                href={filter.href}
                title={copy.removeFilterAria.replace("{label}", filter.label)}
              >
                <span>{filter.label}</span>
                <IconClose width={12} height={12} aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
