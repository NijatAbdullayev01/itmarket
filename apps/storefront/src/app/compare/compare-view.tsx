"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  EmptyState,
  EmptyStateLink,
  IconCompare,
  IconTrash,
  PageLoading,
  Price,
  compareAzStrings,
  formatProductAttributeLabel,
  formatProductAttributeValue,
  getProductImageAlt,
  getProductImageUrl,
  useConfirmDialog,
} from "@itmarket/ui";
import { useIsClient } from "@/hooks/use-is-client";
import { useProductCompare } from "@/hooks/use-product-compare";
import { useLocale } from "@/components/locale-provider";
import { formatAzn } from "@/lib/format-azn";
import { ApiError, fetchProductDetail, type ProductDetail } from "@/lib/api";
import { projectProductDetailForVariant } from "@/lib/project-product-for-variant";
import { getStorefrontProductDisplayTitleFromSummary } from "@/lib/product-display-title";
import { formatMessage, localizeCategoryName, type Locale, type StorefrontMessages } from "@/lib/i18n";
import {
  localizeProductAttributeLabel,
  localizeProductAttributeValue,
} from "@/lib/i18n/localize-product-attribute";

type CompareCategory = {
  slug: string;
  name: string;
};

function getCompareCategories(
  products: ProductDetail[],
  categoryNames: Record<string, string>,
): CompareCategory[] {
  const categories = new Map<string, CompareCategory>();

  for (const product of products) {
    if (!categories.has(product.category.slug)) {
      categories.set(product.category.slug, {
        slug: product.category.slug,
        name: localizeCategoryName(
          product.category.slug,
          product.category.name,
          categoryNames,
        ),
      });
    }
  }

  return [...categories.values()].sort((left, right) =>
    compareAzStrings(left.name, right.name),
  );
}

function resolveProductPrice(product: ProductDetail): number | null {
  const raw = product.price ?? product.variants[0]?.price ?? null;
  if (raw === null) {
    return null;
  }

  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function resolveProductAvailability(product: ProductDetail): number {
  if (typeof product.available === "number" && Number.isFinite(product.available)) {
    return product.available;
  }

  return product.variants.reduce((sum, variant) => sum + variant.available, 0);
}

type CompareRowFilter = "all" | "similar" | "different" | "advantages";

type CompareAdvantage = "better" | "worse" | "neutral";

type CompareRow = {
  key: string;
  label: string;
  values: string[];
  renderValue: (product: ProductDetail) => ReactNode;
};

const COMPARE_FILTER_OPTIONS: Array<{
  value: CompareRowFilter;
  key: "filterAll" | "filterSimilar" | "filterDifferent" | "filterAdvantages";
}> = [
  { value: "all", key: "filterAll" },
  { value: "similar", key: "filterSimilar" },
  { value: "different", key: "filterDifferent" },
  { value: "advantages", key: "filterAdvantages" },
];

function rowValuesAreSimilar(values: string[]): boolean {
  if (values.length <= 1) {
    return true;
  }

  return values.every((value) => value === values[0]);
}

function isCompareRowVisible(
  values: string[],
  filter: CompareRowFilter,
): boolean {
  if (filter === "all" || filter === "advantages") {
    return true;
  }

  const similar = rowValuesAreSimilar(values);
  return filter === "similar" ? similar : !similar;
}

function parseComparableNumber(
  value: string,
  priceUnavailable?: string,
): number | null {
  if (value === "—" || (priceUnavailable !== undefined && value === priceUnavailable)) {
    return null;
  }

  const normalized = value.replace(/,/g, ".");
  const match = normalized.match(/(\d+(?:\.\d+)?)/);

  if (!match) {
    return null;
  }

  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function getProductRowScore(
  row: CompareRow,
  product: ProductDetail,
): number | null {
  switch (row.key) {
    case "price": {
      const price = resolveProductPrice(product);
      return price === null ? null : price;
    }
    case "stock":
      return resolveProductAvailability(product) > 0 ? 1 : 0;
    case "category":
    case "brand":
      return null;
    default: {
      const raw = product.variants[0]?.attributes[row.key] ?? "—";

      if (raw === "—") {
        return null;
      }

      return parseComparableNumber(formatProductAttributeValue(row.key, raw));
    }
  }
}

function getRowAdvantages(
  row: CompareRow,
  products: ProductDetail[],
): CompareAdvantage[] {
  if (row.key === "category" || row.key === "brand") {
    return products.map(() => "neutral");
  }

  const direction = row.key === "price" ? "lower" : "higher";
  const scores = products.map((product) => getProductRowScore(row, product));
  const comparableScores = scores.filter((score): score is number => score !== null);

  if (comparableScores.length === 0) {
    return products.map(() => "neutral");
  }

  const best =
    direction === "lower"
      ? Math.min(...comparableScores)
      : Math.max(...comparableScores);
  const worst =
    direction === "lower"
      ? Math.max(...comparableScores)
      : Math.min(...comparableScores);

  if (best === worst) {
    return products.map(() => "neutral");
  }

  return scores.map((score) => {
    if (score === null) {
      return "worse";
    }

    if (score === best) {
      return "better";
    }

    return "worse";
  });
}

function CompareAdvantageIcon({ advantage }: { advantage: CompareAdvantage }) {
  if (advantage === "neutral") {
    return null;
  }

  const isBetter = advantage === "better";

  return (
    <span
      className={`ui-compare__advantage-icon ${
        isBetter
          ? "ui-compare__advantage-icon--better"
          : "ui-compare__advantage-icon--worse"
      }`}
      aria-hidden="true"
    >
      {isBetter ? (
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none">
          <path
            d="M20 6 9 17l-5-5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none">
          <path
            d="M6 6l12 12M18 6 6 18"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      )}
    </span>
  );
}

function CompareCell({
  value,
  advantage,
  showAdvantages,
  betterLabel,
  worseLabel,
}: {
  value: ReactNode;
  advantage: CompareAdvantage;
  showAdvantages: boolean;
  betterLabel: string;
  worseLabel: string;
}) {
  if (!showAdvantages) {
    return value;
  }

  const label =
    advantage === "better"
      ? betterLabel
      : advantage === "worse"
        ? worseLabel
        : undefined;

  return (
    <div className="ui-compare__cell" aria-label={label}>
      <CompareAdvantageIcon advantage={advantage} />
      <span className="ui-compare__cell-value">{value}</span>
    </div>
  );
}


function buildCompareRows(
  products: ProductDetail[],
  messages: StorefrontMessages,
  locale: Locale,
): CompareRow[] {
  const priceUnavailable = messages.common.priceUnavailable;
  const categoryNames = messages.catalog.categoryNames;
  const inStockLabel = messages.common.inStock;
  const outOfStockLabel = messages.common.outOfStock;
  const attributeKeys = new Set<string>();
  for (const product of products) {
    const attributes = product.variants[0]?.attributes ?? {};
    for (const key of Object.keys(attributes)) {
      attributeKeys.add(key);
    }
  }

  const sortedAttributeKeys = [...attributeKeys].sort(compareAzStrings);

  const rows: CompareRow[] = [
    {
      key: "price",
      label: messages.compare.priceLabel,
      values: products.map((product) => {
        const priceValue = resolveProductPrice(product);
        return priceValue === null ? priceUnavailable : formatAzn(priceValue);
      }),
      renderValue: (product) => {
        const priceValue = resolveProductPrice(product);

        if (priceValue === null) {
          return priceUnavailable;
        }

        return <Price value={formatAzn(priceValue)} />;
      },
    },
    {
      key: "category",
      label: messages.compare.categoryLabel.replace(/:$/, ""),
      values: products.map((product) =>
        localizeCategoryName(
          product.category.slug,
          product.category.name,
          categoryNames,
        ),
      ),
      renderValue: (product) =>
        localizeCategoryName(
          product.category.slug,
          product.category.name,
          categoryNames,
        ),
    },
    {
      key: "brand",
      label: messages.compare.brandLabel,
      values: products.map((product) => product.brand?.name ?? "—"),
      renderValue: (product) => product.brand?.name ?? "—",
    },
    {
      key: "stock",
      label: messages.compare.stockLabel,
      values: products.map((product) =>
        resolveProductAvailability(product) > 0
          ? inStockLabel
          : outOfStockLabel,
      ),
      renderValue: (product) =>
        resolveProductAvailability(product) > 0
          ? inStockLabel
          : outOfStockLabel,
    },
  ];

  for (const key of sortedAttributeKeys) {
    const sampleValue =
      products
        .map((product) => product.variants[0]?.attributes[key])
        .find((value) => value) ?? "";
    const rawLabel = formatProductAttributeLabel(key, sampleValue);
    const localizedLabel = localizeProductAttributeLabel(rawLabel, messages);

    rows.push({
      key,
      label: localizedLabel,
      values: products.map((product) => {
        const value = product.variants[0]?.attributes[key] ?? "—";
        if (value === "—") return value;
        const formatted = formatProductAttributeValue(key, value);
        return localizeProductAttributeValue(key, formatted, locale);
      }),
      renderValue: (product) => {
        const value = product.variants[0]?.attributes[key] ?? "—";

        if (value === "—") {
          return value;
        }

        const formatted = formatProductAttributeValue(key, value);
        return localizeProductAttributeValue(key, formatted, locale);
      },
    });
  }

  return rows;
}

function filterCompareRows(
  rows: CompareRow[],
  filter: CompareRowFilter,
): CompareRow[] {
  return rows.filter((row) => isCompareRowVisible(row.values, filter));
}

type CompareTableProps = {
  products: ProductDetail[];
  visibleRows: CompareRow[];
  showAdvantages: boolean;
  onRemove: (productId: string) => void;
  messages: import("@/lib/i18n/messages/types").StorefrontMessages;
};

function CompareTable({
  products,
  visibleRows,
  showAdvantages,
  onRemove,
  messages,
}: CompareTableProps) {
  const { requestConfirm, confirmDialog } = useConfirmDialog();

  return (
    <>
    <table className="ui-compare__table">
      <thead>
        <tr>
          <th scope="col" className="ui-compare__feature-col">
            <span className="sr-only">{messages.compare.specColumn}</span>
          </th>
          {products.map((product) => {
            const displayTitle = getStorefrontProductDisplayTitleFromSummary(product);
            const variantId = product.defaultVariantId ?? product.id;
            const productHref =
              product.defaultVariantId === null
                ? `/products/${product.slug}`
                : `/products/${product.slug}?variant=${product.defaultVariantId}`;
            return (
            <th key={variantId} scope="col">
              <div className="ui-compare__product-head">
                <Link href={productHref}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getProductImageUrl(product.image)}
                    alt={getProductImageAlt(product.image, displayTitle)}
                    loading="lazy"
                  />
                </Link>
                <Link href={productHref}>{displayTitle}</Link>
                <button
                  type="button"
                  className="ui-compare__remove"
                  onClick={() =>
                    requestConfirm({
                      title: messages.compare.removeTitle,
                      message: `${messages.compare.removeConfirm}`,
                      confirmLabel: messages.common.delete,
                      cancelLabel: messages.common.cancel,
                      onConfirm: () => onRemove(variantId),
                    })
                  }
                >
                  {messages.common.remove}
                </button>
              </div>
            </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {visibleRows.length === 0 ? (
          <tr>
            <td
              colSpan={products.length + 1}
              className="ui-compare__empty-filter"
            >
              {messages.compare.noMatchingSpecs}
            </td>
          </tr>
        ) : (
          visibleRows.map((row) => {
            const advantages = getRowAdvantages(row, products);

            return (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                {products.map((product, index) => (
                  <td key={`${product.defaultVariantId ?? product.id}-${row.key}`}>
                    <CompareCell
                      value={row.renderValue(product)}
                      advantage={advantages[index]}
                      showAdvantages={showAdvantages}
                      betterLabel={messages.compare.betterAdvantage}
                      worseLabel={messages.compare.worseAdvantage}
                    />
                  </td>
                ))}
              </tr>
            );
          })
        )}
      </tbody>
    </table>
    {confirmDialog}
    </>
  );
}

async function fetchProduct(slug: string): Promise<ProductDetail | null> {
  try {
    return await fetchProductDetail(slug);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      return null;
    }
    return null;
  }
}

export function CompareView() {
  const hydrated = useIsClient();
  const { items, remove, clear } = useProductCompare();
  const { locale, messages } = useLocale();
  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowFilter, setRowFilter] = useState<CompareRowFilter>("all");
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      if (items.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const results = await Promise.all(
        items.map(async (item) => {
          const detail = await fetchProduct(item.slug);
          if (!detail) {
            return null;
          }
          return projectProductDetailForVariant(detail, item.variantId);
        }),
      );
      if (!cancelled) {
        setProducts(
          results.filter((product): product is ProductDetail => product !== null),
        );
        setLoading(false);
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [items]);

  const compareCategories = useMemo(
    () => getCompareCategories(products, messages.catalog.categoryNames),
    [products, messages.catalog.categoryNames],
  );

  const activeCategorySlug = useMemo(() => {
    if (compareCategories.length === 0) {
      return null;
    }

    if (
      selectedCategorySlug &&
      compareCategories.some((category) => category.slug === selectedCategorySlug)
    ) {
      return selectedCategorySlug;
    }

    return compareCategories[0].slug;
  }, [compareCategories, selectedCategorySlug]);

  const filteredProducts = useMemo(() => {
    if (!activeCategorySlug) {
      return products;
    }

    return products.filter(
      (product) => product.category.slug === activeCategorySlug,
    );
  }, [products, activeCategorySlug]);

  const compareRows = useMemo(
    () =>
      buildCompareRows(
        filteredProducts,
        messages,
        locale,
      ),
    [filteredProducts, messages, locale],
  );

  const visibleRows = useMemo(
    () => filterCompareRows(compareRows, rowFilter),
    [compareRows, rowFilter],
  );

  // Avoid empty↔content flash from localStorage: hold a calm slot until hydrated.
  if (!hydrated) {
    return (
      <div
        className="ui-local-pending"
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="sr-only">{messages.compare.loading}</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title={messages.compare.emptyTitle}
        description={messages.compare.emptyDescription}
        icon={<IconCompare width={40} height={40} />}
        action={<EmptyStateLink href="/" label={messages.common.viewProducts} />}
      />
    );
  }

  if (loading) {
    return (
      <PageLoading
        variant="compare"
        label={messages.compare.loading}
        showTitle={false}
        framed={false}
      />
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title={messages.compare.dataMissingTitle}
        description={messages.compare.dataMissingDescription}
        action={
          <button type="button" className="ui-btn" onClick={clear}>
            {messages.compare.clearList}
          </button>
        }
      />
    );
  }

  return (
    <div className="ui-compare">
      <div className="ui-compare__table-wrap">
        <aside className="ui-compare__sidebar" aria-label={messages.compare.sidebarAria}>
          <div className="ui-compare__sidebar-top">
            <p className="ui-compare__count">
              {formatMessage(messages.compare.addedCount, { count: products.length })}
            </p>
            <button
              type="button"
              className="ui-compare__clear"
              onClick={clear}
            >
              <IconTrash width={16} height={16} aria-hidden="true" />
              {messages.favorites.clearAll}
            </button>
          </div>

          <div className="ui-compare__filter-section">
            <fieldset className="ui-compare__filters">
              <legend className="ui-compare__filter-title">{messages.compare.showLabel}</legend>
              {COMPARE_FILTER_OPTIONS.map((option) => {
                const inputId = `compare-filter-${option.value}`;

                return (
                  <label
                    key={option.value}
                    htmlFor={inputId}
                    className="ui-compare__filter-option"
                  >
                    <input
                      id={inputId}
                      type="radio"
                      name="compareRowFilter"
                      className="ui-compare__filter-radio"
                      checked={rowFilter === option.value}
                      onChange={() => setRowFilter(option.value)}
                    />
                    {messages.compare[option.key]}
                  </label>
                );
              })}
            </fieldset>
          </div>

          <div className="ui-compare__category-section">
            <fieldset className="ui-compare__filters">
              <legend className="ui-compare__filter-title">{messages.compare.categoryLabel}</legend>
              {compareCategories.map((category) => {
                const inputId = `compare-category-${category.slug}`;

                return (
                  <label
                    key={category.slug}
                    htmlFor={inputId}
                    className="ui-compare__filter-option"
                  >
                    <input
                      id={inputId}
                      type="radio"
                      name="compareCategory"
                      className="ui-compare__filter-radio"
                      checked={activeCategorySlug === category.slug}
                      onChange={() => setSelectedCategorySlug(category.slug)}
                    />
                    {category.name}
                  </label>
                );
              })}
            </fieldset>
          </div>
        </aside>

        <div className="ui-compare__table-scroll">
          <CompareTable
            products={filteredProducts}
            visibleRows={visibleRows}
            showAdvantages={rowFilter === "advantages"}
            onRemove={remove}
            messages={messages}
          />
        </div>
      </div>
    </div>
  );
}
