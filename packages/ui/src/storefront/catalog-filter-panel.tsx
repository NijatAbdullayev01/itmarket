"use client";

import { useState, type ReactNode, type SyntheticEvent } from "react";
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

const COLOR_OPTIONS = [
  "Qara",
  "Ağ",
  "Gümüşü",
  "Mavi",
  "Tünd mavi",
  "Qırmızı",
  "Yaşıl",
  "Boz",
  "Qızılı",
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
};

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
  defaultOpen = false,
}: {
  id: string;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  function handleToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    setOpen(event.currentTarget.open);
  }

  return (
    <details className="ui-catalog-facet" open={open} onToggle={handleToggle}>
      <summary className="ui-catalog-facet__summary" id={id}>
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
}: CatalogFilterPanelProps) {
  const tree = getCategoryTree(categories);
  const sortedBrands = [...brands].sort((left, right) =>
    left.name.localeCompare(right.name, "az"),
  );

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

  return (
    <div className="ui-catalog-sidebar__panel">
      <FacetSection id="catalog-facet-price" title="Qiymət aralığı" defaultOpen>
        <CatalogPriceRange base={base} />
      </FacetSection>

      <FacetSection id="catalog-facet-brand" title="Brend" defaultOpen>
        <div
          className="ui-catalog-facet__list ui-catalog-facet__list--scroll"
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
        title="Kateqoriya"
        defaultOpen={false}
      >
        <div
          className="ui-catalog-facet__list ui-catalog-facet__list--scroll"
          role="list"
        >
          <FacetOption
            href={buildCatalogHref({ ...base, category: undefined })}
            label="Bütün kateqoriyalar"
            active={!category}
          />
          <CategoryFacetList nodes={tree} base={base} />
        </div>
      </FacetSection>

      <FacetSection
        id="catalog-facet-availability"
        title="Mövcudluq"
        defaultOpen={false}
      >
        <div className="ui-catalog-facet__list" role="list">
          <FacetOption
            href={buildCatalogHref({
              ...base,
              inStock: inStock ? undefined : true,
            })}
            label="Stokda var"
            active={Boolean(inStock)}
          />
          <FacetOption
            href={buildCatalogHref({
              ...base,
              onSale: onSale ? undefined : true,
            })}
            label="Endirimdə"
            active={Boolean(onSale)}
          />
        </div>
      </FacetSection>

      <FacetSection
        id="catalog-facet-storage"
        title="Yaddaş"
        defaultOpen={false}
      >
        <div className="ui-catalog-facet__list" role="list">
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

      <FacetSection id="catalog-facet-ram" title="RAM" defaultOpen={false}>
        <div className="ui-catalog-facet__list" role="list">
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

      <FacetSection id="catalog-facet-color" title="Rəng" defaultOpen={false}>
        <div className="ui-catalog-facet__list" role="list">
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
