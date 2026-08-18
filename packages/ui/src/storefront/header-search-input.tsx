"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  Suspense,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { getProductCatalogDisplayTitle } from "@itmarket/contracts";
import { formatAznValue, formatListedAznValue } from "../utils/format-azn";
import {
  getProductImageAlt,
  getProductImageUrl,
  type ProductMedia,
} from "../utils/product-image";
import { getVariantPermanentStorageLabel } from "../utils/product-variant-attributes";
import { formatChromeMessage } from "./chrome-copy";
import { IconChevronRight, IconSearch } from "./icons";
import {
  DefaultMediaImage,
  type MediaImageComponent,
} from "./media-image";

const SEARCH_DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 8;
const CATALOG_SEARCH_PATH = "/api/v1/storefront/catalog/products";

type CatalogSearchItem = {
  id: string;
  name: string;
  slug: string;
  category: { name: string; slug: string; parentSlug?: string | null };
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
    category: item.category,
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

function localizeSearchCategoryName(
  slug: string,
  fallbackName: string,
  categoryNames?: Record<string, string>,
) {
  const localized = categoryNames?.[slug]?.trim();
  return localized && localized.length > 0 ? localized : fallbackName;
}

function categorySlugFromHref(href: string): string | null {
  const match = href.match(/\/categories\/([^/?#]+)/);
  if (match === null) {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
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
      href: `/categories/${encodeURIComponent(item.category.slug)}`,
    });
  }

  return { products, titleSuggestions, categories };
}

function SearchPanelSkeleton({
  listId,
  loadingLabel = "Axtar\u0131l\u0131r\u2026",
}: {
  listId: string;
  loadingLabel?: string;
}) {
  return (
    <div
      className="ui-header-search-panel ui-header-search-panel--loading"
      id={listId}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{loadingLabel}</span>
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

function EmptySearchResults({
  query,
  emptyTitle,
  emptyHint,
}: {
  query: string;
  emptyTitle: string;
  emptyHint: string;
}) {
  return (
    <div className="ui-header-search-panel__empty" role="status">
      <IconSearch width={22} height={22} aria-hidden="true" />
      <p>{formatChromeMessage(emptyTitle, { query })}</p>
      <span>{emptyHint}</span>
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
  loadingLabel?: string;
  resultsLabel?: string;
  emptyTitle?: string;
  emptyHint?: string;
  suggestionsLabel?: string;
  categoriesLabel?: string;
  outOfStockLabel?: string;
  priceUnavailableLabel?: string;
  viewAllResultsLabel?: string;
  categoryNames?: Record<string, string>;
  Image?: MediaImageComponent;
};

function SearchPanel({
  query,
  results,
  loading,
  listId,
  onClose,
  onPickSuggestion,
  loadingLabel = "Axtar\u0131l\u0131r\u2026",
  resultsLabel = "Axtar\u0131\u015F n\u0259tic\u0259l\u0259ri",
  emptyTitle = "\u201C{query}\u201D \u00FC\u00E7\u00FCn n\u0259tic\u0259 tap\u0131lmad\u0131",
  emptyHint = "Ba\u015Fqa a\u00E7ar s\u00F6z, model v\u0259 ya brend ad\u0131 yoxlay\u0131n",
  suggestionsLabel = "T\u0259klifl\u0259r",
  categoriesLabel = "Kateqoriyalar",
  outOfStockLabel = "Stokda yoxdur",
  priceUnavailableLabel = "Sor\u011fu \u0259sas\u0131nda",
  viewAllResultsLabel = "B\u00FCt\u00FCn n\u0259tic\u0259l\u0259r\u0259 bax",
  categoryNames,
  Image: ImageComponent = DefaultMediaImage,
}: SearchPanelProps) {
  const trimmedQuery = query.trim();
  const catalogHref = `/?q=${encodeURIComponent(trimmedQuery)}`;

  if (results === null && loading) {
    return <SearchPanelSkeleton listId={listId} loadingLabel={loadingLabel} />;
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
        aria-label={resultsLabel}
      >
        <EmptySearchResults
          query={trimmedQuery}
          emptyTitle={emptyTitle}
          emptyHint={emptyHint}
        />
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
      aria-label={resultsLabel}
    >
      <div className="ui-header-search-panel__body">
        {showAside ? (
          <aside className="ui-header-search-panel__aside">
            {results.titleSuggestions.length > 0 ? (
              <section className="ui-header-search-panel__section">
                <p className="ui-header-search-panel__section-title">{suggestionsLabel}</p>
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
                <p className="ui-header-search-panel__section-title">{categoriesLabel}</p>
                <ul className="ui-header-search-panel__categories">
                  {results.categories.map((category) => {
                    const slug = categorySlugFromHref(category.href);
                    const label = slug
                      ? localizeSearchCategoryName(
                          slug,
                          category.name,
                          categoryNames,
                        )
                      : category.name;
                    return (
                      <li key={category.href}>
                        <Link
                          href={category.href}
                          className="ui-header-search-panel__category"
                          role="option"
                          onClick={onClose}
                        >
                          <span>{label}</span>
                          <IconChevronRight width={14} height={14} aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </aside>
        ) : null}

        <div className="ui-header-search-panel__products">
          {results.products.length === 0 ? (
            <EmptySearchResults
              query={trimmedQuery}
              emptyTitle={emptyTitle}
              emptyHint={emptyHint}
            />
          ) : (
            <ul>
              {results.products.map((product) => {
                const formattedPrice = formatListedAznValue(product.price);
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
                        <ImageComponent
                          src={product.imageUrl}
                          alt={product.imageAlt}
                          width={72}
                          height={72}
                          sizes="72px"
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
                            {outOfStockLabel}
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
                          {formattedPrice ?? priceUnavailableLabel}
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
          {viewAllResultsLabel}
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
  placeholder,
  submitLabel,
}: {
  listId: string;
  showPanel: boolean;
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  submitLabel: string;
}) {
  return (
    <div className="ui-header-search">
      <input
        id="header-search"
        name="q"
        placeholder={placeholder}
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
        <span className="sr-only">{submitLabel}</span>
        <IconSearch width={18} height={18} />
      </button>
    </div>
  );
}

type HeaderSearchInputProps = {
  placeholder?: string;
  submitLabel?: string;
  loadingLabel?: string;
  resultsLabel?: string;
  emptyTitle?: string;
  emptyHint?: string;
  suggestionsLabel?: string;
  categoriesLabel?: string;
  outOfStockLabel?: string;
  priceUnavailableLabel?: string;
  viewAllResultsLabel?: string;
  categoryNames?: Record<string, string>;
  /** Optional app-level image renderer (e.g. next/image). */
  Image?: MediaImageComponent;
};

function SearchQuerySync({
  onQuery,
}: {
  onQuery: (query: string) => void;
}) {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.trim() ?? "";

  useEffect(() => {
    onQuery(searchQuery);
  }, [onQuery, searchQuery]);

  return null;
}

export function HeaderSearchInput({
  placeholder = "M\u0259hsul, model, SKU v\u0259 ya brend axtar...",
  submitLabel = "Axtar",
  loadingLabel = "Axtar\u0131l\u0131r\u2026",
  resultsLabel = "Axtar\u0131\u015F n\u0259tic\u0259l\u0259ri",
  emptyTitle = "\u201C{query}\u201D \u00FC\u00E7\u00FCn n\u0259tic\u0259 tap\u0131lmad\u0131",
  emptyHint = "Ba\u015Fqa a\u00E7ar s\u00F6z, model v\u0259 ya brend ad\u0131 yoxlay\u0131n",
  suggestionsLabel = "T\u0259klifl\u0259r",
  categoriesLabel = "Kateqoriyalar",
  outOfStockLabel = "Stokda yoxdur",
  priceUnavailableLabel = "Sor\u011fu \u0259sas\u0131nda",
  viewAllResultsLabel = "B\u00FCt\u00FCn n\u0259tic\u0259l\u0259r\u0259 bax",
  categoryNames,
  Image: ImageComponent = DefaultMediaImage,
}: HeaderSearchInputProps = {}) {
  const router = useRouter();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<HeaderSearchResults | null>(null);
  const onQuery = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  useEffect(() => {
    setValue(searchQuery);
    // Submitted catalog search (?q=) must not reopen the live suggestions panel.
    setOpen(false);
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

  const closePanel = () => setOpen(false);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" || event.key === "Enter") {
      closePanel();
    }
  };

  useEffect(() => {
    const form = wrapRef.current?.closest("form");
    if (form === null || form === undefined) {
      return;
    }

    const onSubmit = () => {
      closePanel();
    };

    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, []);

  const onPickSuggestion = (suggestion: string) => {
    setValue(suggestion);
    setOpen(false);
    router.push(`/?q=${encodeURIComponent(suggestion)}`);
  };

  return (
    <div className="ui-header-search-wrap" ref={wrapRef}>
      <Suspense fallback={null}>
        <SearchQuerySync onQuery={onQuery} />
      </Suspense>
      <HeaderSearchBar
        listId={listId}
        showPanel={showPanel}
        value={value}
        placeholder={placeholder}
        submitLabel={submitLabel}
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
          loadingLabel={loadingLabel}
          resultsLabel={resultsLabel}
          emptyTitle={emptyTitle}
          emptyHint={emptyHint}
          suggestionsLabel={suggestionsLabel}
          categoriesLabel={categoriesLabel}
          outOfStockLabel={outOfStockLabel}
          priceUnavailableLabel={priceUnavailableLabel}
          viewAllResultsLabel={viewAllResultsLabel}
          categoryNames={categoryNames}
          Image={ImageComponent}
        />
      ) : null}
    </div>
  );
}

export function HeaderSearchInputFallback({
  placeholder = "M\u0259hsul, model, SKU v\u0259 ya brend axtar...",
  submitLabel = "Axtar",
}: {
  placeholder?: string;
  submitLabel?: string;
} = {}) {
  return (
    <div className="ui-header-search-wrap">
      <div className="ui-header-search">
        <input
          id="header-search"
          name="q"
          placeholder={placeholder}
          autoComplete="off"
        />
        <button type="submit" className="ui-header-search__submit">
          <span className="sr-only">{submitLabel}</span>
          <IconSearch width={18} height={18} />
        </button>
      </div>
    </div>
  );
}
