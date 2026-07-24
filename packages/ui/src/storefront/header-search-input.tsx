"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { getProductCatalogDisplayTitle } from "@itmarket/contracts";
import { formatAznValue } from "../utils/format-azn";
import {
  getProductImageAlt,
  getProductImageUrl,
  type ProductMedia,
} from "../utils/product-image";
import { getVariantPermanentStorageLabel } from "../utils/product-variant-attributes";
import { IconChevronRight, IconSearch } from "./icons";

const SEARCH_DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 8;
const CATALOG_SEARCH_PATH = "/api/v1/storefront/catalog/products";

type CatalogSearchItem = {
  id: string;
  name: string;
  slug: string;
  category: { name: string; slug: string };
  brand: { name: string; slug: string } | null;
  image: ProductMedia | null;
  price: string | null;
  previousPrice: string | null;
  available?: number;
  defaultVariantId: string | null;
  variantName?: string;
  variantAttributes?: Record<string, string>;
};

type HeaderSearchProduct = {
  id: string;
  href: string;
  name: string;
  meta: string | null;
  imageUrl: string;
  imageAlt: string;
  price: string | null;
  previousPrice: string | null;
  available: boolean;
};

type HeaderSearchCategory = {
  name: string;
  href: string;
};

type HeaderSearchResults = {
  products: HeaderSearchProduct[];
  titleSuggestions: string[];
  categories: HeaderSearchCategory[];
};

function highlightQuery(text: string, query: string): ReactNode {
  const trimmed = query.trim();
  if (trimmed === "") {
    return text;
  }

  const lowerText = text.toLocaleLowerCase("az");
  const lowerQuery = trimmed.toLocaleLowerCase("az");
  const index = lowerText.indexOf(lowerQuery);
  if (index < 0) {
    return text;
  }

  const before = text.slice(0, index);
  const match = text.slice(index, index + trimmed.length);
  const after = text.slice(index + trimmed.length);
  return (
    <>
      {before}
      <mark className="ui-header-search-mark">{match}</mark>
      {after}
    </>
  );
}

function buildVariantMeta(item: CatalogSearchItem): string | null {
  const variantName = item.variantName?.trim() || null;
  if (
    variantName &&
    variantName.toLocaleLowerCase("az") !== item.name.toLocaleLowerCase("az")
  ) {
    return variantName;
  }

  return getVariantPermanentStorageLabel(
    item.variantAttributes ?? {},
    item.variantName,
  );
}

function mapCatalogItem(item: CatalogSearchItem): HeaderSearchProduct {
  const name = getProductCatalogDisplayTitle({
    brandName: item.brand?.name ?? null,
    modelName: item.name,
    variantName: item.variantName,
    variantAttributes: item.variantAttributes,
  });
  const href =
    item.defaultVariantId === null
      ? `/products/${item.slug}`
      : `/products/${item.slug}?variant=${item.defaultVariantId}`;

  return {
    id: item.defaultVariantId ?? item.id,
    href,
    name,
    meta: buildVariantMeta(item),
    imageUrl: getProductImageUrl(item.image),
    imageAlt: getProductImageAlt(item.image, name),
    price: item.price,
    previousPrice: item.previousPrice,
    available: (item.available ?? 0) > 0,
  };
}

async function fetchCatalogSearch(
  query: string,
  signal: AbortSignal,
): Promise<HeaderSearchResults> {
  const params = new URLSearchParams({
    search: query,
    limit: String(RESULT_LIMIT),
  });
  const response = await fetch(`${CATALOG_SEARCH_PATH}?${params.toString()}`, {
    signal,
    cache: "no-store",
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Catalog search failed (${response.status})`);
  }

  const payload = (await response.json()) as { items?: CatalogSearchItem[] };
  const items = Array.isArray(payload.items) ? payload.items : [];
  const products = items.map(mapCatalogItem);

  const titleSuggestions: string[] = [];
  const seenTitles = new Set<string>();
  for (const product of products) {
    const key = product.name.toLocaleLowerCase("az");
    if (seenTitles.has(key)) {
      continue;
    }
    seenTitles.add(key);
    titleSuggestions.push(product.name);
    if (titleSuggestions.length >= 6) {
      break;
    }
  }

  const categories: HeaderSearchCategory[] = [];
  const seenCategories = new Set<string>();
  for (const item of items) {
    if (seenCategories.has(item.category.slug)) {
      continue;
    }
    seenCategories.add(item.category.slug);
    categories.push({
      name: item.category.name,
      href: `/?category=${encodeURIComponent(item.category.slug)}`,
    });
  }

  return { products, titleSuggestions, categories };
}

function SearchPanelSkeleton({ listId }: { listId: string }) {
  return (
    <div
      className="ui-header-search-panel ui-header-search-panel--loading"
      id={listId}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Axtarılır…</span>
      <div className="ui-header-search-panel__aside" aria-hidden="true">
        <div className="ui-header-search-skeleton ui-header-search-skeleton--line" />
        <div className="ui-header-search-skeleton ui-header-search-skeleton--line ui-header-search-skeleton--short" />
        <div className="ui-header-search-skeleton ui-header-search-skeleton--line" />
      </div>
      <div className="ui-header-search-panel__products" aria-hidden="true">
        <div className="ui-header-search-skeleton ui-header-search-skeleton--card" />
        <div className="ui-header-search-skeleton ui-header-search-skeleton--card" />
        <div className="ui-header-search-skeleton ui-header-search-skeleton--card" />
      </div>
    </div>
  );
}

function EmptySearchResults({ query }: { query: string }) {
  return (
    <div className="ui-header-search-panel__empty" role="status">
      <IconSearch width={22} height={22} aria-hidden="true" />
      <p>
        <strong>“{query}”</strong> üçün nəticə tapılmadı
      </p>
      <span>Başqa açar söz və ya brend adı yoxlayın</span>
    </div>
  );
}

type SearchPanelProps = {
  query: string;
  results: HeaderSearchResults | null;
  loading: boolean;
  listId: string;
  onClose: () => void;
  onPickSuggestion: (suggestion: string) => void;
};

function SearchPanel({
  query,
  results,
  loading,
  listId,
  onClose,
  onPickSuggestion,
}: SearchPanelProps) {
  const trimmedQuery = query.trim();
  const catalogHref = `/?q=${encodeURIComponent(trimmedQuery)}`;

  if (results === null && loading) {
    return <SearchPanelSkeleton listId={listId} />;
  }

  if (results === null) {
    return null;
  }

  const hasResults =
    results.products.length > 0 ||
    results.titleSuggestions.length > 0 ||
    results.categories.length > 0;

  if (!hasResults) {
    return (
      <div
        className="ui-header-search-panel ui-header-search-panel--empty"
        id={listId}
        role="listbox"
        aria-label="Axtarış nəticələri"
      >
        <EmptySearchResults query={trimmedQuery} />
      </div>
    );
  }

  const showAside =
    results.titleSuggestions.length > 0 || results.categories.length > 0;

  return (
    <div
      className={
        showAside
          ? "ui-header-search-panel"
          : "ui-header-search-panel ui-header-search-panel--products-only"
      }
      id={listId}
      role="listbox"
      aria-label="Axtarış nəticələri"
    >
      <div className="ui-header-search-panel__body">
        {showAside ? (
          <aside className="ui-header-search-panel__aside">
            {results.titleSuggestions.length > 0 ? (
              <section className="ui-header-search-panel__section">
                <p className="ui-header-search-panel__section-title">Təkliflər</p>
                <ul className="ui-header-search-panel__suggestions">
                  {results.titleSuggestions.map((suggestion) => (
                    <li key={suggestion}>
                      <button
                        type="button"
                        className="ui-header-search-panel__suggestion"
                        role="option"
                        onClick={() => onPickSuggestion(suggestion)}
                      >
                        <span className="ui-header-search-panel__suggestion-icon" aria-hidden="true">
                          <IconSearch width={14} height={14} />
                        </span>
                        <span className="ui-header-search-panel__suggestion-text">
                          {highlightQuery(suggestion, trimmedQuery)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {results.categories.length > 0 ? (
              <section className="ui-header-search-panel__section ui-header-search-panel__section--categories">
                <p className="ui-header-search-panel__section-title">Kateqoriyalar</p>
                <ul className="ui-header-search-panel__categories">
                  {results.categories.map((category) => (
                    <li key={category.href}>
                      <Link
                        href={category.href}
                        className="ui-header-search-panel__category"
                        role="option"
                        onClick={onClose}
                      >
                        <span>{category.name}</span>
                        <IconChevronRight width={14} height={14} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </aside>
        ) : null}

        <div className="ui-header-search-panel__products">
          {results.products.length === 0 ? (
            <EmptySearchResults query={trimmedQuery} />
          ) : (
            <ul>
              {results.products.map((product) => {
                const formattedPrice = formatAznValue(product.price);
                const formattedPrevious =
                  product.previousPrice === null
                    ? null
                    : formatAznValue(product.previousPrice);
                const onSale =
                  formattedPrevious !== null &&
                  formattedPrice !== null &&
                  product.previousPrice !== null &&
                  product.price !== null &&
                  Number(product.previousPrice) > Number(product.price);

                return (
                  <li key={product.id}>
                    <Link
                      href={product.href}
                      className={
                        product.available
                          ? "ui-header-search-product"
                          : "ui-header-search-product ui-header-search-product--unavailable"
                      }
                      role="option"
                      onClick={onClose}
                    >
                      <span className="ui-header-search-product__media">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.imageUrl}
                          alt={product.imageAlt}
                          width={72}
                          height={72}
                          loading="lazy"
                        />
                      </span>
                      <span className="ui-header-search-product__body">
                        <span className="ui-header-search-product__name">
                          {highlightQuery(product.name, trimmedQuery)}
                        </span>
                        {product.meta ? (
                          <span className="ui-header-search-product__meta">
                            {product.meta}
                          </span>
                        ) : null}
                        {!product.available ? (
                          <span className="ui-header-search-product__stock">
                            Stokda yoxdur
                          </span>
                        ) : null}
                      </span>
                      <span className="ui-header-search-product__prices">
                        {onSale && formattedPrevious ? (
                          <span className="ui-header-search-product__price-old">
                            {formattedPrevious}
                          </span>
                        ) : null}
                        <span
                          className={
                            onSale
                              ? "ui-header-search-product__price ui-header-search-product__price--sale"
                              : "ui-header-search-product__price"
                          }
                        >
                          {formattedPrice ?? "—"}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="ui-header-search-panel__footer">
        <Link
          href={catalogHref}
          className="ui-header-search-panel__view-all"
          onClick={onClose}
        >
          Bütün nəticələrə bax
          <IconChevronRight width={16} height={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

function HeaderSearchBar({
  listId,
  showPanel,
  value,
  onChange,
  onFocus,
  onKeyDown,
}: {
  listId: string;
  showPanel: boolean;
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="ui-header-search">
      <input
        id="header-search"
        name="q"
        placeholder="Məhsul, SKU və ya brend axtar..."
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showPanel}
        aria-controls={showPanel ? listId : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
      />
      <button type="submit" className="ui-header-search__submit">
        <span className="sr-only">Axtar</span>
        <IconSearch width={18} height={18} />
      </button>
    </div>
  );
}

export function HeaderSearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.trim() ?? "";
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(searchQuery);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<HeaderSearchResults | null>(null);

  useEffect(() => {
    setValue(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const query = value.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      setResults(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      void fetchCatalogSearch(query, controller.signal)
        .then((next) => {
          setResults(next);
          setOpen(true);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) {
            return;
          }
          setResults({ products: [], titleSuggestions: [], categories: [] });
          console.error(error);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (
        wrapRef.current !== null &&
        !wrapRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const showPanel =
    open &&
    value.trim().length >= MIN_QUERY_LENGTH &&
    (loading || results !== null);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" || event.key === "Enter") {
      setOpen(false);
    }
  };

  const onPickSuggestion = (suggestion: string) => {
    setValue(suggestion);
    setOpen(false);
    router.push(`/?q=${encodeURIComponent(suggestion)}`);
  };

  return (
    <div className="ui-header-search-wrap" ref={wrapRef}>
      <HeaderSearchBar
        listId={listId}
        showPanel={showPanel}
        value={value}
        onChange={(next) => {
          setValue(next);
          setOpen(true);
        }}
        onFocus={() => {
          if (value.trim().length >= MIN_QUERY_LENGTH) {
            setOpen(true);
          }
        }}
        onKeyDown={onKeyDown}
      />
      {showPanel ? (
        <SearchPanel
          query={value}
          results={loading && results === null ? null : results}
          loading={loading && results === null}
          listId={listId}
          onClose={() => setOpen(false)}
          onPickSuggestion={onPickSuggestion}
        />
      ) : null}
    </div>
  );
}

export function HeaderSearchInputFallback() {
  return (
    <div className="ui-header-search-wrap">
      <div className="ui-header-search">
        <input
          id="header-search"
          name="q"
          placeholder="Məhsul, SKU və ya brend axtar..."
          autoComplete="off"
        />
        <button type="submit" className="ui-header-search__submit">
          <span className="sr-only">Axtar</span>
          <IconSearch width={18} height={18} />
        </button>
      </div>
    </div>
  );
}
