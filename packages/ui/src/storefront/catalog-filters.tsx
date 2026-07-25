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

type CatalogFiltersProps = CatalogHrefFilters & {
  categories: CategoryItem[];
  brands: { id: string; name: string; slug: string }[];
  children: ReactNode;
};

function formatPriceChip(minPrice?: number, maxPrice?: number) {
  if (minPrice !== undefined && maxPrice !== undefined) {
    return `${minPrice} – ${maxPrice} ₼`;
  }
  if (minPrice !== undefined) {
    return `${minPrice} ₼ və çox`;
  }
  if (maxPrice !== undefined) {
    return `0 – ${maxPrice} ₼`;
  }
  return "Qiymət";
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
  children,
}: CatalogFiltersProps) {
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
          label: `“${q.trim()}”`,
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
          label: formatPriceChip(minPrice, maxPrice),
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
          label: "Stokda var",
          href: buildCatalogHref({ ...base, inStock: undefined }),
        }
      : null,
    onSale
      ? {
          key: "onSale",
          label: "Endirimdə",
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
          label: `Yaddaş ${storage}`,
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
      <aside className="ui-catalog-sidebar" aria-label="Filterlər">
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
              <span>Filterlər</span>
              {activeCount > 0 ? (
                <span className="ui-catalog-filters__badge">{activeCount}</span>
              ) : null}
            </span>
            <span className="ui-catalog-filters__toggle-hint">Aç / bağla</span>
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
          />
        </details>
      </aside>

      <div className="ui-catalog-main">
        {activeFilters.length > 0 ? (
          <div className="ui-filter-chips" aria-label="Aktiv filterlər">
            <Link
              className="ui-filter-chip ui-filter-chip--clear"
              href={clearAllHref}
            >
              {activeCount > 1 ? "Hamısını təmizlə" : "Təmizlə"}
            </Link>
            {activeFilters.map((filter) => (
              <Link
                key={filter.key}
                className="ui-filter-chip ui-filter-chip--active ui-filter-chip--dismiss"
                href={filter.href}
                title={`${filter.label} filterini sil`}
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
