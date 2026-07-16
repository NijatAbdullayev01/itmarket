"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  EmptyState,
  EmptyStateLink,
  IconTrash,
  Price,
  formatProductAttributeLabel,
  formatProductAttributeValue,
  getProductImageAlt,
  getProductImageUrl,
} from "@itmarket/ui";
import { useProductCompare } from "@/hooks/use-product-compare";
import { formatAzn } from "@/lib/format-azn";
import type { ProductDetail } from "@/lib/api";

type CompareCategory = {
  slug: string;
  name: string;
};

function getCompareCategories(products: ProductDetail[]): CompareCategory[] {
  const categories = new Map<string, CompareCategory>();

  for (const product of products) {
    if (!categories.has(product.category.slug)) {
      categories.set(product.category.slug, {
        slug: product.category.slug,
        name: product.category.name,
      });
    }
  }

  return [...categories.values()].sort((left, right) =>
    left.name.localeCompare(right.name, "az"),
  );
}

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"
).replace(/\/+$/, "");

function resolveProductPrice(product: ProductDetail): number | null {
  const raw = product.price ?? product.variants[0]?.price ?? null;
  if (raw === null) {
    return null;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
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
  label: string;
}> = [
  { value: "all", label: "Hamısı" },
  { value: "similar", label: "Oxşarlıqlar" },
  { value: "different", label: "Fərqlər" },
  { value: "advantages", label: "Üstünlüklər" },
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

function parseComparableNumber(value: string): number | null {
  if (value === "—" || value === "Qiymət yoxdur") {
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
}: {
  value: ReactNode;
  advantage: CompareAdvantage;
  showAdvantages: boolean;
}) {
  if (!showAdvantages) {
    return value;
  }

  const label =
    advantage === "better"
      ? "Üstün"
      : advantage === "worse"
        ? "Aşağı"
        : undefined;

  return (
    <div className="ui-compare__cell" aria-label={label}>
      <CompareAdvantageIcon advantage={advantage} />
      <span className="ui-compare__cell-value">{value}</span>
    </div>
  );
}


function buildCompareRows(products: ProductDetail[]): CompareRow[] {
  const attributeKeys = new Set<string>();
  for (const product of products) {
    const attributes = product.variants[0]?.attributes ?? {};
    for (const key of Object.keys(attributes)) {
      attributeKeys.add(key);
    }
  }

  const sortedAttributeKeys = [...attributeKeys].sort((left, right) =>
    left.localeCompare(right, "az"),
  );

  const rows: CompareRow[] = [
    {
      key: "price",
      label: "Qiymət",
      values: products.map((product) => {
        const priceValue = resolveProductPrice(product);
        return priceValue === null ? "Qiymət yoxdur" : formatAzn(priceValue);
      }),
      renderValue: (product) => {
        const priceValue = resolveProductPrice(product);

        if (priceValue === null) {
          return "Qiymət yoxdur";
        }

        return <Price value={formatAzn(priceValue)} />;
      },
    },
    {
      key: "category",
      label: "Kateqoriya",
      values: products.map((product) => product.category.name),
      renderValue: (product) => product.category.name,
    },
    {
      key: "brand",
      label: "Brend",
      values: products.map((product) => product.brand?.name ?? "—"),
      renderValue: (product) => product.brand?.name ?? "—",
    },
    {
      key: "stock",
      label: "Stok",
      values: products.map((product) =>
        resolveProductAvailability(product) > 0
          ? "Stokda var"
          : "Stokda yoxdur",
      ),
      renderValue: (product) =>
        resolveProductAvailability(product) > 0
          ? "Stokda var"
          : "Stokda yoxdur",
    },
  ];

  for (const key of sortedAttributeKeys) {
    const sampleValue =
      products
        .map((product) => product.variants[0]?.attributes[key])
        .find((value) => value) ?? "";

    rows.push({
      key,
      label: formatProductAttributeLabel(key, sampleValue),
      values: products.map((product) => {
        const value = product.variants[0]?.attributes[key] ?? "—";
        return value === "—" ? value : formatProductAttributeValue(key, value);
      }),
      renderValue: (product) => {
        const value = product.variants[0]?.attributes[key] ?? "—";

        if (value === "—") {
          return value;
        }

        return formatProductAttributeValue(key, value);
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
};

function CompareTable({
  products,
  visibleRows,
  showAdvantages,
  onRemove,
}: CompareTableProps) {
  return (
    <table className="ui-compare__table">
      <thead>
        <tr>
          <th scope="col" className="ui-compare__feature-col">
            <span className="sr-only">Xüsusiyyət</span>
          </th>
          {products.map((product) => (
            <th key={product.id} scope="col">
              <div className="ui-compare__product-head">
                <Link href={`/products/${product.slug}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getProductImageUrl(product.image)}
                    alt={getProductImageAlt(product.image, product.name)}
                    loading="lazy"
                  />
                </Link>
                <Link href={`/products/${product.slug}`}>{product.name}</Link>
                <button
                  type="button"
                  className="ui-compare__remove"
                  onClick={() => onRemove(product.id)}
                >
                  Sil
                </button>
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {visibleRows.length === 0 ? (
          <tr>
            <td
              colSpan={products.length + 1}
              className="ui-compare__empty-filter"
            >
              Seçilmiş filtrə uyğun xüsusiyyət tapılmadı.
            </td>
          </tr>
        ) : (
          visibleRows.map((row) => {
            const advantages = getRowAdvantages(row, products);

            return (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                {products.map((product, index) => (
                  <td key={`${product.id}-${row.key}`}>
                    <CompareCell
                      value={row.renderValue(product)}
                      advantage={advantages[index]}
                      showAdvantages={showAdvantages}
                    />
                  </td>
                ))}
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

async function fetchProduct(slug: string): Promise<ProductDetail | null> {
  try {
    const response = await fetch(
      `${API_BASE}/storefront/catalog/products/${slug}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    return (await response.json()) as ProductDetail;
  } catch {
    return null;
  }
}

export function CompareView() {
  const { items, remove, clear } = useProductCompare();
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
      const results = await Promise.all(items.map((item) => fetchProduct(item.slug)));
      if (!cancelled) {
        setProducts(results.filter((product): product is ProductDetail => product !== null));
        setLoading(false);
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [items]);

  const compareCategories = useMemo(
    () => getCompareCategories(products),
    [products],
  );

  useEffect(() => {
    if (compareCategories.length === 0) {
      setSelectedCategorySlug(null);
      return;
    }

    setSelectedCategorySlug((current) => {
      if (current && compareCategories.some((category) => category.slug === current)) {
        return current;
      }

      return compareCategories[0].slug;
    });
  }, [compareCategories]);

  const filteredProducts = useMemo(() => {
    if (!selectedCategorySlug) {
      return products;
    }

    return products.filter(
      (product) => product.category.slug === selectedCategorySlug,
    );
  }, [products, selectedCategorySlug]);

  const compareRows = useMemo(
    () => buildCompareRows(filteredProducts),
    [filteredProducts],
  );

  const visibleRows = useMemo(
    () => filterCompareRows(compareRows, rowFilter),
    [compareRows, rowFilter],
  );

  if (items.length === 0) {
    return (
      <EmptyState
        title="Müqayisə siyahısı boşdur"
        description="Məhsul kartlarında müqayisə düyməsinə basaraq məhsulları əlavə edin."
        action={<EmptyStateLink href="/" label="Məhsullara bax" />}
      />
    );
  }

  if (loading) {
    return <p className="ui-compare-status">Məhsullar yüklənir...</p>;
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title="Müqayisə məlumatı tapılmadı"
        description="Seçilmiş məhsullar artıq mövcud deyil və ya API əlçatan deyil."
        action={
          <button type="button" className="ui-btn" onClick={clear}>
            Siyahını təmizlə
          </button>
        }
      />
    );
  }

  return (
    <div className="ui-compare">
      <div className="ui-compare__table-wrap">
        <aside className="ui-compare__sidebar" aria-label="Müqayisə idarəetməsi">
          <div className="ui-compare__sidebar-top">
            <p className="ui-compare__count">
              Əlavə olunub: {products.length}
            </p>
            <button
              type="button"
              className="ui-compare__clear"
              onClick={clear}
            >
              <IconTrash width={16} height={16} aria-hidden="true" />
              Hamısını sil
            </button>
          </div>

          <div className="ui-compare__filter-section">
            <fieldset className="ui-compare__filters">
              <legend className="ui-compare__filter-title">Göstər:</legend>
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
                    {option.label}
                  </label>
                );
              })}
            </fieldset>
          </div>

          <div className="ui-compare__category-section">
            <fieldset className="ui-compare__filters">
              <legend className="ui-compare__filter-title">Kateqoriya:</legend>
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
                      checked={selectedCategorySlug === category.slug}
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
          />
        </div>
      </div>
    </div>
  );
}
