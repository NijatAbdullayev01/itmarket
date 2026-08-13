"use client";

import {
  getProductImageAlt,
  getProductImageUrl,
  useConfirmDialog,
} from "@itmarket/ui";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import type { CampaignProductPreview } from "./campaigns-bestsellers-panel";

export type WeeklyDealRow = {
  id: string;
  productId: string;
  sortOrder: number;
  product: CampaignProductPreview;
};

export type WeeklyDealSearchProduct = {
  id: string;
  name: string;
  slug: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  brand: { id?: string; name: string } | null;
  media: CampaignProductPreview["media"];
  variants: Array<{
    id: string;
    sku: string;
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  }>;
};

type SearchProduct = WeeklyDealSearchProduct;

type RunFn = <T>(
  action: () => Promise<T>,
  success: string,
  options?: { refresh?: boolean; onSuccess?: (result: T) => void },
) => Promise<T | null>;

type CampaignsWeeklyDealPanelProps = {
  canCatalog: boolean;
  canCatalogRead: boolean;
  run: RunFn;
  loadWeeklyDeals: () => Promise<{ items: WeeklyDealRow[] }>;
  searchProducts: (query: string) => Promise<{ items: SearchProduct[] }>;
  onAddProduct: (productId: string) => Promise<unknown>;
  onRemoveProduct: (id: string) => Promise<unknown>;
  onReorder: (orderedIds: string[]) => Promise<unknown>;
};

function hasActiveVariant(product: SearchProduct) {
  return product.variants.some(
    (variant) => variant.status === undefined || variant.status === "ACTIVE",
  );
}

export function CampaignsWeeklyDealPanel({
  canCatalog,
  canCatalogRead,
  run,
  loadWeeklyDeals,
  searchProducts,
  onAddProduct,
  onRemoveProduct,
  onReorder,
}: CampaignsWeeklyDealPanelProps) {
  const searchId = useId();
  const { requestConfirm, confirmDialog } = useConfirmDialog();
  const [items, setItems] = useState<WeeklyDealRow[]>([]);
  const [loading, setLoading] = useState(canCatalogRead);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [resultsQuery, setResultsQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const trimmedQuery = query.trim();
  const canSearch = canCatalog && trimmedQuery.length >= 2;
  const visibleResults =
    canSearch && resultsQuery === trimmedQuery ? results : [];
  const searching = canSearch && resultsQuery !== trimmedQuery;

  const selectedIds = useMemo(
    () => new Set(items.map((item) => item.productId)),
    [items],
  );

  const reload = useCallback(async () => {
    const result = await loadWeeklyDeals();
    setItems(result.items);
  }, [loadWeeklyDeals]);

  useEffect(() => {
    if (!canCatalogRead) {
      return;
    }

    let cancelled = false;
    void loadWeeklyDeals()
      .then((result) => {
        if (cancelled) {
          return;
        }
        setItems(result.items);
        setError("");
      })
      .catch((caught: unknown) => {
        if (cancelled) {
          return;
        }
        setError(
          caught instanceof Error
            ? caught.message
            : "Həftənin təklifi yüklənmədi",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canCatalogRead, loadWeeklyDeals]);

  useEffect(() => {
    if (!canSearch) {
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void searchProducts(trimmedQuery)
        .then((result) => {
          if (cancelled) {
            return;
          }
          setResultsQuery(trimmedQuery);
          setResults(
            result.items.filter(
              (product) =>
                product.status !== "ARCHIVED" &&
                product.status !== "DRAFT" &&
                hasActiveVariant(product),
            ),
          );
        })
        .catch(() => {
          if (!cancelled) {
            setResultsQuery(trimmedQuery);
            setResults([]);
          }
        });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [canSearch, trimmedQuery, searchProducts]);

  async function addProduct(product: SearchProduct) {
    setBusyId(product.id);
    await run(
      () => onAddProduct(product.id),
      "Məhsul həftənin təklifinə əlavə olundu",
      {
        refresh: false,
        onSuccess: () => {
          setQuery("");
          setResults([]);
          void reload();
        },
      },
    );
    setBusyId(null);
  }

  async function moveItem(id: string, direction: -1 | 1) {
    const index = items.findIndex((item) => item.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= items.length) {
      return;
    }
    const orderedIds = items.map((item) => item.id);
    const current = orderedIds[index];
    const swap = orderedIds[nextIndex];
    if (current === undefined || swap === undefined) {
      return;
    }
    orderedIds[index] = swap;
    orderedIds[nextIndex] = current;
    setBusyId(id);
    await run(() => onReorder(orderedIds), "Sıra yeniləndi", {
      refresh: false,
      onSuccess: () => {
        void reload();
      },
    });
    setBusyId(null);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  if (!canCatalog && !canCatalogRead) {
    return (
      <section className="catalog-section" aria-label="Həftənin təklifi">
        <article className="operation-card">
          <h2>Giriş icazəsi yoxdur</h2>
          <p className="card-note">
            Bu səhifəyə yalnız <code>catalog.read</code> icazəsi olan əməkdaşlar
            daxil ola bilər.
          </p>
        </article>
      </section>
    );
  }

  return (
    <section
      className="catalog-subcategories-page"
      aria-label="Həftənin təklifi"
    >
      {confirmDialog}
      <article className="catalog-subcategories-board">
        <header className="catalog-banners-placement__head">
          <div>
            <p className="catalog-banners-placement__page">Ana səhifə</p>
            <h2>Həftənin təklifi</h2>
            <p className="catalog-banners-placement__desc">
              Burada seçdiyiniz məhsullar müştəri ana səhifəsində «Həftənin
              təklifi» başlığı altında görünür. Sıranı dəyişmək üçün ox
              düymələrindən istifadə edin.
            </p>
          </div>
        </header>

        {canCatalog ? (
          <form
            className="campaign-product-search"
            onSubmit={submitSearch}
            role="search"
          >
            <label className="catalog-subcategories-filter" htmlFor={searchId}>
              <span className="catalog-subcategories-filter__label">
                Məhsul axtar
              </span>
              <input
                id={searchId}
                type="search"
                value={query}
                autoComplete="off"
                placeholder="Ad, SKU və ya barkod"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            {searching ? <p className="card-note">Axtarılır…</p> : null}
            {visibleResults.length > 0 ? (
              <ul className="campaign-product-search__results">
                {visibleResults.map((product) => {
                  const image = product.media[0] ?? null;
                  const already = selectedIds.has(product.id);
                  return (
                    <li key={product.id} className="campaign-product-item">
                      <div
                        className="campaign-product-item__preview"
                        aria-hidden="true"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getProductImageUrl(image)}
                          alt={getProductImageAlt(image, product.name)}
                        />
                      </div>
                      <div className="campaign-product-item__body">
                        <strong>{product.name}</strong>
                        <span className="pos-meta">
                          {product.brand?.name ?? "Brend yoxdur"}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="catalog-subcategories-form__submit"
                        disabled={already || busyId === product.id}
                        onClick={() => void addProduct(product)}
                      >
                        {already ? "Əlavə olunub" : "Əlavə et"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : canSearch && !searching ? (
              <p className="card-note">Uyğun aktiv məhsul tapılmadı.</p>
            ) : null}
          </form>
        ) : (
          <p className="card-note">
            Məhsul seçmək üçün <code>catalog.write</code> icazəsi lazımdır.
          </p>
        )}

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="card-note">Yüklənir…</p>
        ) : items.length === 0 ? (
          <div className="catalog-subcategories-empty">
            <strong>Həftənin təklifi seçilməyib</strong>
            <p>
              Yuxarıdan məhsul axtarıb əlavə edin. Seçim olmayanda bu bölmə
              müştəri ana səhifəsində gizlədilir.
            </p>
          </div>
        ) : (
          <ol className="campaign-product-list">
            {items.map((row, index) => {
              const image = row.product.media[0] ?? null;
              const busy = busyId === row.id;
              return (
                <li key={row.id} className="campaign-product-item">
                  <span className="campaign-product-item__rank">
                    {index + 1}
                  </span>
                  <div
                    className="campaign-product-item__preview"
                    aria-hidden="true"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getProductImageUrl(image)}
                      alt={getProductImageAlt(image, row.product.name)}
                    />
                  </div>
                  <div className="campaign-product-item__body">
                    <strong>{row.product.name}</strong>
                    <span className="pos-meta">
                      {row.product.brand?.name ?? "Brend yoxdur"}
                      {row.product.sku ? ` · ${row.product.sku}` : ""}
                    </span>
                  </div>
                  {canCatalog ? (
                    <div className="campaign-product-item__actions">
                      <button
                        type="button"
                        className="catalog-subcategories-form__cancel"
                        disabled={busy || index <= 0}
                        onClick={() => void moveItem(row.id, -1)}
                        aria-label="Yuxarı daşı"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="catalog-subcategories-form__cancel"
                        disabled={busy || index >= items.length - 1}
                        onClick={() => void moveItem(row.id, 1)}
                        aria-label="Aşağı daşı"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="catalog-subcategories-delete"
                        disabled={busy}
                        onClick={() =>
                          requestConfirm({
                            title: "Təklifdən çıxar",
                            message: `"${row.product.name}" məhsulunu həftənin təklifindən çıxarmaq istəyirsiniz?`,
                            onConfirm: async () => {
                              setBusyId(row.id);
                              await run(
                                () => onRemoveProduct(row.id),
                                "Məhsul təklifdən çıxarıldı",
                                {
                                  refresh: false,
                                  onSuccess: () => {
                                    void reload();
                                  },
                                },
                              );
                              setBusyId(null);
                            },
                          })
                        }
                      >
                        Çıxar
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </article>
    </section>
  );
}
