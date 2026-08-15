"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  startPosBarcodeCameraScan,
  type PosBarcodeScanSession,
} from "../../lib/pos-barcode-camera-scan";
import {
  FETCH_OFFSET_PAGE_SIZE,
  fetchAllOffsetPages,
} from "../../lib/fetch-cursor-pages";
import { IconBarcodeScan, IconClose, IconSearch } from "./bo-icons";

export type PosProductItem = {
  id: string;
  productId: string;
  productName: string;
  name: string;
  sku: string;
  barcode: string | null;
  price: string;
  currency: string;
  available: number;
};

type PosProductsResponse = {
  shiftId: string;
  location: { id: string; code: string; name: string };
  items: PosProductItem[];
  total: number;
};

type PosProductPickerProps = {
  active: boolean;
  refreshKey: number;
  fetchProducts: (query: {
    search: string;
    limit: number;
    offset: number;
  }) => Promise<PosProductsResponse>;
  onSelect: (product: PosProductItem) => void;
  formatMoney: (value: string | number) => string;
};

export function PosProductPicker({
  active,
  refreshKey,
  fetchProducts,
  onSelect,
  formatMoney,
}: PosProductPickerProps) {
  const searchFieldId = useId();
  const scannerTitleId = useId();
  const requestIdRef = useRef(0);
  const scanSessionRef = useRef<PosBarcodeScanSession | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState<PosProductItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerAttempt, setScannerAttempt] = useState(0);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [scannerStatus, setScannerStatus] = useState<
    "starting" | "ready" | "error"
  >("starting");
  const [scannerError, setScannerError] = useState("");
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadProducts = useCallback(async () => {
    if (!active) {
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    try {
      const response = await fetchAllOffsetPages(
        (offset, limit) =>
          fetchProducts({
            search: debouncedSearch,
            limit,
            offset,
          }),
        { pageSize: FETCH_OFFSET_PAGE_SIZE },
      );
      if (requestId !== requestIdRef.current) {
        return;
      }
      setItems(response.items);
      setTotal(response.total);
    } catch (caught) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setItems([]);
      setTotal(0);
      setError(
        caught instanceof Error
          ? caught.message
          : "Məhsullar yüklənmədi",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [active, debouncedSearch, fetchProducts]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts, refreshKey]);

  const closeScanner = useCallback(() => {
    scanSessionRef.current?.stop();
    scanSessionRef.current = null;
    setScannerOpen(false);
    setScannerStatus("starting");
    setScannerError("");
  }, []);

  useEffect(() => {
    if (!active) {
      setSearch("");
      setDebouncedSearch("");
      setItems([]);
      setTotal(0);
      setError("");
      setLoading(false);
      closeScanner();
    }
  }, [active, closeScanner]);

  useEffect(() => {
    if (!scannerOpen || videoEl === null) {
      return;
    }

    let cancelled = false;
    setScannerStatus("starting");
    setScannerError("");

    void (async () => {
      try {
        const session = await startPosBarcodeCameraScan(videoEl, (barcode) => {
          if (cancelled) {
            return;
          }
          setSearch(barcode);
          closeScanner();
        });
        if (cancelled) {
          session.stop();
          return;
        }
        scanSessionRef.current = session;
        setScannerStatus("ready");
      } catch (caught) {
        if (cancelled) {
          return;
        }
        setScannerStatus("error");
        setScannerError(
          caught instanceof Error
            ? caught.message
            : "Kamera skanı başlamadı",
        );
      }
    })();

    return () => {
      cancelled = true;
      scanSessionRef.current?.stop();
      scanSessionRef.current = null;
    };
  }, [scannerOpen, scannerAttempt, videoEl, closeScanner]);

  useEffect(() => {
    if (!scannerOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeScanner();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [scannerOpen, closeScanner]);

  if (!active) {
    return null;
  }

  const hasSearch = debouncedSearch.length > 0;
  const sellableCount = items.filter((item) => item.available > 0).length;
  const showClear = search.length > 0;

  const scannerDialog =
    scannerOpen && portalReady
      ? createPortal(
          <div className="ui-modal pos-barcode-scanner" role="presentation">
            <button
              type="button"
              className="bo-btn-reset ui-modal__backdrop"
              aria-label="Barkod skanını bağla"
              onClick={closeScanner}
            />
            <div
              className="ui-modal__dialog pos-barcode-scanner__dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby={scannerTitleId}
            >
              <header className="pos-barcode-scanner__header">
                <div>
                  <h2 id={scannerTitleId}>Barkod skanı</h2>
                  <p className="pos-meta">
                    Kameranı barkoda yönəldin — tapılan kod axtarışa düşəcək
                  </p>
                </div>
                <button
                  type="button"
                  className="bo-btn-reset pos-barcode-scanner__close"
                  aria-label="Bağla"
                  onClick={closeScanner}
                >
                  <IconClose className="bo-icon--sm" aria-hidden="true" />
                </button>
              </header>

              <div className="pos-barcode-scanner__stage">
                <video
                  ref={setVideoEl}
                  className="pos-barcode-scanner__video"
                  playsInline
                  muted
                  autoPlay
                />
                <div
                  className="pos-barcode-scanner__frame"
                  aria-hidden="true"
                />
                {scannerStatus === "starting" ? (
                  <p className="pos-barcode-scanner__status">
                    Kamera açılır…
                  </p>
                ) : null}
                {scannerStatus === "ready" ? (
                  <p className="pos-barcode-scanner__status pos-barcode-scanner__status--ready">
                    Barkodu çərçivəyə yerləşdirin
                  </p>
                ) : null}
                {scannerStatus === "error" ? (
                  <p
                    className="pos-barcode-scanner__status pos-barcode-scanner__status--error"
                    role="alert"
                  >
                    {scannerError}
                  </p>
                ) : null}
              </div>

              <div className="pos-barcode-scanner__actions">
                <button
                  type="button"
                  className="bo-btn-reset pos-barcode-scanner__btn pos-barcode-scanner__btn--ghost"
                  onClick={closeScanner}
                >
                  Ləğv et
                </button>
                {scannerStatus === "error" ? (
                  <button
                    type="button"
                    className="pos-barcode-scanner__btn pos-barcode-scanner__btn--primary"
                    onClick={() => {
                      scanSessionRef.current?.stop();
                      scanSessionRef.current = null;
                      setScannerAttempt((current) => current + 1);
                    }}
                  >
                    Yenidən cəhd et
                  </button>
                ) : null}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="pos-product-picker">
      <div className="pos-product-picker__head">
        <div className="pos-search-block">
          <div className="pos-search-block__label-row">
            <label className="pos-search-block__label" htmlFor={searchFieldId}>
              Məhsul axtarışı
            </label>
            {showClear ? (
              <span className="pos-search-block__hint" aria-hidden="true">
                Esc — təmizlə
              </span>
            ) : null}
          </div>

          <div
            className={[
              "pos-search",
              showClear ? "pos-search--filled" : "",
              loading ? "pos-search--loading" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="pos-search__icon-wrap" aria-hidden="true">
              <IconSearch className="pos-search__icon" />
            </span>
            <input
              id={searchFieldId}
              className="pos-search__input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && search.length > 0) {
                  event.preventDefault();
                  setSearch("");
                }
              }}
              placeholder="Məs. iPhone, model, SKU və ya barkod"
              autoComplete="off"
              autoFocus
              spellCheck={false}
              inputMode="search"
              enterKeyHint="search"
            />
            <div className="pos-search__trail">
              {loading ? (
                <span className="pos-search__spinner" aria-hidden="true" />
              ) : null}
              {showClear ? (
                <button
                  type="button"
                  className="bo-btn-reset pos-search__clear"
                  aria-label="Axtarışı təmizlə"
                  onClick={() => setSearch("")}
                >
                  <IconClose className="bo-icon--sm" aria-hidden="true" />
                </button>
              ) : null}
              <button
                type="button"
                className="bo-btn-reset pos-search__scan"
                aria-label="Kameranın barkodunu skan et"
                title="Kameranın barkodunu skan et"
                onClick={() => setScannerOpen(true)}
              >
                <IconBarcodeScan
                  className="bo-icon--sm pos-search__scan-icon"
                  aria-hidden="true"
                />
                <span className="pos-search__scan-label">Skan</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pos-product-picker__body" aria-live="polite">
        {error !== "" ? (
          <p className="pos-product-picker__error">{error}</p>
        ) : loading && items.length === 0 ? (
          <div className="pos-empty pos-empty--soft">
            <p>Məhsullar yüklənir…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="pos-empty pos-empty--soft">
            <strong>
              {hasSearch ? "Nəticə tapılmadı" : "Stokda məhsul yoxdur"}
            </strong>
            <p>
              {hasSearch
                ? "Axtarış sözünü dəyişin və ya barkodu yenidən skan edin."
                : "Bu kassa məntəqəsində satış üçün aktiv stok qalığı yoxdur."}
            </p>
          </div>
        ) : (
          <>
            <div className="pos-product-toolbar">
              <h3 className="pos-cart-header__title">
                {loading ? (
                  "Yenilənir…"
                ) : hasSearch ? (
                  <>
                    <span className="pos-product-toolbar__full">
                      Nəticə sayı:{" "}
                    </span>
                    <span className="pos-product-toolbar__short">Nəticə: </span>
                    <span className="pos-cart-header__count">{total}</span>
                  </>
                ) : (
                  <>
                    <span className="pos-product-toolbar__full">
                      Satıla biləcək məhsul sayı:{" "}
                    </span>
                    <span className="pos-product-toolbar__short">Satıla bilən: </span>
                    <span className="pos-cart-header__count">{sellableCount}</span>
                  </>
                )}
              </h3>
            </div>
            <div className="pos-product-grid">
              {items.map((item) => {
                const outOfStock = item.available <= 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={[
                      "bo-btn-reset",
                      "pos-product-card",
                      outOfStock ? "pos-product-card--disabled" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={outOfStock}
                    aria-label={
                      outOfStock
                        ? `${item.productName} — stokda yoxdur`
                        : `${item.productName} — səbətə əlavə et`
                    }
                    onClick={() => onSelect(item)}
                  >
                    <span className="pos-product-card__top">
                      <span className="pos-product-card__sku" title={item.sku}>
                        {item.sku}
                      </span>
                      <span
                        className={[
                          "pos-product-card__stock",
                          outOfStock
                            ? "pos-product-card__stock--empty"
                            : item.available <= 3
                              ? "pos-product-card__stock--low"
                              : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {outOfStock ? "Bitib" : `${item.available} ədəd`}
                      </span>
                    </span>
                    <strong className="pos-product-card__title" title={item.productName}>
                      {item.productName}
                    </strong>
                    {item.name !== item.productName ? (
                      <span className="pos-product-card__variant" title={item.name}>
                        {item.name}
                      </span>
                    ) : null}
                    <span className="pos-product-card__footer">
                      <span className="pos-product-card__price">
                        {formatMoney(item.price)}
                      </span>
                      <span className="pos-product-card__action" aria-hidden="true">
                        {outOfStock ? "—" : "+"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
      {scannerDialog}
    </div>
  );
}
