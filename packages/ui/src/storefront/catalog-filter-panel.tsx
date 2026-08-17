"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

import {
  getCategoryTree,
  type CategoryItem,
  type CategoryTreeNode,
} from "./category-items";
import { CatalogPriceRange } from "./catalog-price-range";
import { IconCheck, IconChevronDown } from "./icons";
import {
  buildCatalogHref,
  type CatalogHrefFilters,
} from "./catalog-search-header";
import { type CatalogFiltersCopy, defaultCatalogFiltersCopy } from "./catalog-filters";
import { compareByAzName } from "../utils/compare-az-string";

/** Matches catalog mobile layout breakpoint in components.css */
const CATALOG_MOBILE_MQ = "(max-width: 768px)";

const COLOR_OPTIONS = [
  "Qara",
  "A\u011F",
  "G\u00FCm\u00FC\u015F\u00FC",
  "Mavi",
  "T\u00FCnd mavi",
  "Q\u0131rm\u0131z\u0131",
  "Ya\u015F\u0131l",
  "Boz",
  "Q\u0131z\u0131l\u0131",
  "Titan",
  "Space Gray",
] as const;

const RAM_OPTIONS = [
  "4GB",
  "6GB",
  "8GB",
  "12GB",
  "16GB",
  "18GB",
  "24GB",
  "32GB",
  "64GB",
] as const;

const STORAGE_OPTIONS = [
  "64GB",
  "128GB",
  "256GB",
  "512GB",
  "1TB",
  "2TB",
] as const;

type CatalogFilterPanelProps = CatalogHrefFilters & {
  categories: CategoryItem[];
  brands: { id: string; name: string; slug: string }[];
  copy?: Partial<CatalogFiltersCopy>;
};

function useIsCatalogMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(CATALOG_MOBILE_MQ);
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return isMobile;
}

function FacetOption({
  href,
  label,
  active,
  depth = 0,
}: {
  href: string;
  label: string;
  active: boolean;
  depth?: number;
}) {
  return (
    <Link
      href={href}
      role="listitem"
      className={
        active
          ? "ui-catalog-facet__option ui-catalog-facet__option--active"
          : "ui-catalog-facet__option"
      }
      style={depth > 0 ? { paddingLeft: `${4 + depth * 16}px` } : undefined}
      aria-current={active ? "true" : undefined}
    >
      <span className="ui-catalog-facet__check" aria-hidden="true">
        {active ? <IconCheck width={11} height={11} /> : null}
      </span>
      <span className="ui-catalog-facet__label">{label}</span>
    </Link>
  );
}

function FacetSection({
  id,
  title,
  children,
  open,
  onOpenChange,
}: {
  id: string;
  title: string;
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <details className="ui-catalog-facet" open={open}>
      <summary
        className="ui-catalog-facet__summary"
        id={id}
        onClick={(event) => {
          event.preventDefault();
          onOpenChange(!open);
        }}
      >
        <span className="ui-catalog-facet__title">{title}</span>
        <span className="ui-catalog-facet__chevron" aria-hidden="true">
          <IconChevronDown width={16} height={16} />
        </span>
      </summary>
      <div className="ui-catalog-facet__body">{children}</div>
    </details>
  );
}

function CategoryFacetList({
  nodes,
  base,
  depth = 0,
}: {
  nodes: CategoryTreeNode[];
  base: CatalogHrefFilters;
  depth?: number;
}) {
  return (
    <>
      {nodes.map((node) => {
        const slug = node.slug?.trim();
        if (!slug) return null;
        const isActive = base.category === slug;
        const childNodes = node.children.map((child) => ({
          ...child,
          children: [] as CategoryItem[],
        })) as CategoryTreeNode[];
        const hasActiveChild = node.children.some(
          (child) => child.slug != null && child.slug === base.category,
        );

        return (
          <div key={node.id} className="ui-catalog-facet__group">
            <FacetOption
              href={buildCatalogHref({ ...base, category: slug })}
              label={node.name}
              active={isActive}
              depth={depth}
            />
            {childNodes.length > 0 &&
            (isActive || hasActiveChild || depth === 0) ? (
              <CategoryFacetList nodes={childNodes} base={base} depth={depth + 1} />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export function CatalogFilterPanel({
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
  copy: copyProp,
}: CatalogFilterPanelProps) {
  const copy = { ...defaultCatalogFiltersCopy, ...copyProp };
  const isMobile = useIsCatalogMobile();
  const [openFacets, setOpenFacets] = useState(
    () => new Set(["catalog-facet-price"]),
  );
  const tree = getCategoryTree(categories);
  const sortedBrands = [...brands].sort(compareByAzName);

  useEffect(() => {
    if (isMobile) {
      setOpenFacets((prev) => {
        if (prev.size <= 1) return prev;
        if (prev.has("catalog-facet-price")) {
          return new Set(["catalog-facet-price"]);
        }
        const first = prev.values().next().value;
        return first ? new Set([first]) : prev;
      });
      return;
    }

    setOpenFacets((prev) => {
      if (prev.has("catalog-facet-brand")) return prev;
      const next = new Set(prev);
      next.add("catalog-facet-brand");
      return next;
    });
  }, [isMobile]);

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

  function handleFacetOpenChange(id: string, nextOpen: boolean) {
    setOpenFacets((prev) => {
      if (isMobile) {
        return nextOpen ? new Set([id]) : new Set();
      }
      const next = new Set(prev);
      if (nextOpen) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <div className="ui-catalog-sidebar__panel">
      <FacetSection
        id="catalog-facet-price"
        title={copy.priceRange}
        open={openFacets.has("catalog-facet-price")}
        onOpenChange={(nextOpen) =>
          handleFacetOpenChange("catalog-facet-price", nextOpen)
        }
      >
        <CatalogPriceRange base={base} copy={{ min: copy.min, max: copy.max, apply: copy.apply }} />
      </FacetSection>

      <FacetSection
        id="catalog-facet-brand"
        title={copy.facetBrand}
        open={openFacets.has("catalog-facet-brand")}
        onOpenChange={(nextOpen) =>
          handleFacetOpenChange("catalog-facet-brand", nextOpen)
        }
      >
        <div
          className="ui-catalog-facet__list ui-catalog-facet__list--chips ui-catalog-facet__list--scroll"
          role="list"
        >
          {sortedBrands.map((entry) => (
            <FacetOption
              key={entry.id}
              href={buildCatalogHref({
                ...base,
                brand: entry.slug === brand ? undefined : entry.slug,
              })}
              label={entry.name}
              active={brand === entry.slug}
            />
          ))}
        </div>
      </FacetSection>

      <FacetSection
        id="catalog-facet-category"
        title={copy.facetCategory}
        open={openFacets.has("catalog-facet-category")}
        onOpenChange={(nextOpen) =>
          handleFacetOpenChange("catalog-facet-category", nextOpen)
        }
      >
        <div
          className="ui-catalog-facet__list ui-catalog-facet__list--scroll"
          role="list"
        >
          <FacetOption
            href={buildCatalogHref({ ...base, category: undefined })}
            label={copy.allCategories}
            active={!category}
          />
          <CategoryFacetList nodes={tree} base={base} />
        </div>
      </FacetSection>

      <FacetSection
        id="catalog-facet-availability"
        title={copy.facetAvailability}
        open={openFacets.has("catalog-facet-availability")}
        onOpenChange={(nextOpen) =>
          handleFacetOpenChange("catalog-facet-availability", nextOpen)
        }
      >
        <div className="ui-catalog-facet__list ui-catalog-facet__list--chips" role="list">
          <FacetOption
            href={buildCatalogHref({
              ...base,
              inStock: inStock ? undefined : true,
            })}
            label={copy.inStock}
            active={Boolean(inStock)}
          />
          <FacetOption
            href={buildCatalogHref({
              ...base,
              onSale: onSale ? undefined : true,
            })}
            label={copy.onSale}
            active={Boolean(onSale)}
          />
        </div>
      </FacetSection>

      <FacetSection
        id="catalog-facet-storage"
        title={copy.facetStorage}
        open={openFacets.has("catalog-facet-storage")}
        onOpenChange={(nextOpen) =>
          handleFacetOpenChange("catalog-facet-storage", nextOpen)
        }
      >
        <div className="ui-catalog-facet__list ui-catalog-facet__list--chips" role="list">
          {STORAGE_OPTIONS.map((option) => {
            const active = storage === option;
            return (
              <FacetOption
                key={option}
                href={buildCatalogHref({
                  ...base,
                  storage: active ? undefined : option,
                })}
                label={option}
                active={active}
              />
            );
          })}
        </div>
      </FacetSection>

      <FacetSection
        id="catalog-facet-ram"
        title={copy.facetRam}
        open={openFacets.has("catalog-facet-ram")}
        onOpenChange={(nextOpen) =>
          handleFacetOpenChange("catalog-facet-ram", nextOpen)
        }
      >
        <div className="ui-catalog-facet__list ui-catalog-facet__list--chips" role="list">
          {RAM_OPTIONS.map((option) => {
            const active = ram === option;
            return (
              <FacetOption
                key={option}
                href={buildCatalogHref({
                  ...base,
                  ram: active ? undefined : option,
                })}
                label={option}
                active={active}
              />
            );
          })}
        </div>
      </FacetSection>

      <FacetSection
        id="catalog-facet-color"
        title={copy.facetColor}
        open={openFacets.has("catalog-facet-color")}
        onOpenChange={(nextOpen) =>
          handleFacetOpenChange("catalog-facet-color", nextOpen)
        }
      >
        <div className="ui-catalog-facet__list ui-catalog-facet__list--chips" role="list">
          {COLOR_OPTIONS.map((option) => {
            const active = color === option;
            return (
              <FacetOption
                key={option}
                href={buildCatalogHref({
                  ...base,
                  color: active ? undefined : option,
                })}
                label={option}
                active={active}
              />
            );
          })}
        </div>
      </FacetSection>
    </div>
  );
}
