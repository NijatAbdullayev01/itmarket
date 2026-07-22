"use client";

import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { getInventoryLocationLabel, pickDefaultInventoryLocationId } from "../../lib/inventory-location-label";
import { getBackofficeProductDisplayTitle } from "../../lib/product-display-title";

import type {
  InventoryBalancePage,
  InventoryBalanceRow,
  InventoryLocation,
  InventoryMovementRow,
} from "./inventory-balance-panel";

type CatalogProduct = {
  id: string;
  name: string;
  brand: { id: string; name: string } | null;
  variants: {
    id: string;
    sku: string;
    barcode: string | null;
    name: string;
    attributes?: unknown;
  }[];
};

type VariantOption = {
  id: string;
  sku: string;
  barcode: string | null;
  label: string;
};

type BalanceSnapshot = {
  onHand: number;
  reserved: number;
};

type QuantityMode = "delta" | "target";

type RunFn = <T>(
  action: () => Promise<T>,
  success: string,
  options?: { refresh?: boolean; onSuccess?: (result: T) => void },
) => Promise<T | null>;

const ADJUSTMENT_SOURCE_TYPES = [
  { value: "STOCK_COUNT", label: "Inventarizasiya" },
  { value: "DAMAGE", label: "Ziyan" },
  { value: "CORRECTION", label: "Korreksiya" },
  { value: "OTHER", label: "Digər" },
] as const;

const MOVEMENTS_LIMIT = 20;
const STOCK_PAGE_SIZE = 20;

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("az-AZ");
}

function getAdjustmentSourceTypeLabel(sourceType: string) {
  return (
    ADJUSTMENT_SOURCE_TYPES.find((entry) => entry.value === sourceType)?.label ??
    sourceType
  );
}

function defaultAdjustmentDocumentId() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `ADJ-${stamp}-001`;
}

function isSafeIntegerInput(raw: string) {
  if (raw.trim() === "") {
    return false;
  }
  const value = Number(raw);
  return Number.isFinite(value) && Number.isInteger(value);
}

function resolveAdjustmentDelta(
  mode: QuantityMode,
  quantityInput: string,
  targetInput: string,
  snapshot: BalanceSnapshot | null,
): { delta: number; hasQuantity: boolean } {
  if (mode === "delta") {
    const delta = Number(quantityInput);
    return {
      delta,
      hasQuantity: isSafeIntegerInput(quantityInput),
    };
  }
  if (!isSafeIntegerInput(targetInput)) {
    return { delta: 0, hasQuantity: false };
  }
  const target = Number(targetInput);
  const onHand = snapshot?.onHand ?? 0;
  return { delta: target - onHand, hasQuantity: true };
}

type InventoryAdjustmentPanelProps = {
  products: CatalogProduct[];
  locations: InventoryLocation[];
  canAdjust: boolean;
  canInventoryRead: boolean;
  refreshKey: number;
  run: RunFn;
  fetchMovements: (limit: number) => Promise<InventoryMovementRow[]>;
  fetchBalances: (query: {
    search: string;
    locationId: string;
    includeZero: boolean;
    limit: number;
    offset: number;
  }) => Promise<InventoryBalancePage>;
  fetchBalanceSnapshot: (
    variantId: string,
    locationId: string,
  ) => Promise<BalanceSnapshot | null>;
  onAdjustment: (form: FormData) => Promise<unknown>;
};

export function InventoryAdjustmentPanel({
  products,
  locations,
  canAdjust,
  canInventoryRead,
  refreshKey,
  run,
  fetchMovements,
  fetchBalances,
  fetchBalanceSnapshot,
  onAdjustment,
}: InventoryAdjustmentPanelProps) {
  const searchParams = useSearchParams();
  const locationFieldId = useId();
  const quantityFieldId = useId();
  const targetQuantityFieldId = useId();
  const stockSearchFieldId = useId();
  const stockLocationFieldId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const deepLinkApplied = useRef(false);

  const variantOptions = useMemo<VariantOption[]>(
    () =>
      products.flatMap((product) =>
        product.variants.map((variant) => {
          const title = getBackofficeProductDisplayTitle(product, variant);
          const label = `${title} · ${variant.sku}`;
          return {
            id: variant.id,
            sku: variant.sku,
            barcode: variant.barcode,
            label,
          };
        }),
      ),
    [products],
  );

  const variantById = useMemo(
    () => new Map(variantOptions.map((option) => [option.id, option])),
    [variantOptions],
  );

  const defaultLocationId = useMemo(
    () => pickDefaultInventoryLocationId(locations),
    [locations],
  );

  const [stockLocationId, setStockLocationId] = useState(defaultLocationId);
  const [stockSearchInput, setStockSearchInput] = useState("");
  const [debouncedStockSearch, setDebouncedStockSearch] = useState("");
  const [stockPage, setStockPage] = useState(0);
  const [stockList, setStockList] = useState<InventoryBalancePage | null>(null);
  const [stockListLoading, setStockListLoading] = useState(false);
  const [stockListError, setStockListError] = useState("");

  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState(defaultLocationId);
  const [quantityMode, setQuantityMode] = useState<QuantityMode>("target");
  const [quantityInput, setQuantityInput] = useState("");
  const [targetQuantityInput, setTargetQuantityInput] = useState("");
  const [snapshot, setSnapshot] = useState<BalanceSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [movements, setMovements] = useState<InventoryMovementRow[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

  useEffect(() => {
    setSelectedLocationId((current) =>
      current === "" ? defaultLocationId : current,
    );
    setStockLocationId((current) =>
      current === "" ? defaultLocationId : current,
    );
  }, [defaultLocationId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedStockSearch(stockSearchInput.trim());
      setStockPage(0);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [stockSearchInput]);

  useEffect(() => {
    if (deepLinkApplied.current) {
      return;
    }
    const variantId = searchParams.get("variantId")?.trim() ?? "";
    const locationId = searchParams.get("locationId")?.trim() ?? "";
    if (variantId === "" && locationId === "") {
      return;
    }
    deepLinkApplied.current = true;
    if (locationId !== "") {
      setSelectedLocationId(locationId);
      setStockLocationId(locationId);
    }
    if (variantId !== "") {
      setSelectedVariantId(variantId);
    }
  }, [searchParams]);

  const selectedVariant = variantById.get(selectedVariantId);

  const adjustmentMovements = useMemo(
    () => movements.filter((movement) => movement.type === "ADJUSTMENT"),
    [movements],
  );

  const { delta: quantityDelta, hasQuantity } = resolveAdjustmentDelta(
    quantityMode,
    quantityInput,
    targetQuantityInput,
    snapshot,
  );

  const projectedOnHand =
    snapshot !== null && hasQuantity
      ? snapshot.onHand + quantityDelta
      : quantityMode === "target" && isSafeIntegerInput(targetQuantityInput)
        ? Number(targetQuantityInput)
        : null;
  const projectedAvailable =
    snapshot !== null && projectedOnHand !== null
      ? projectedOnHand - snapshot.reserved
      : null;

  const loadMovements = useCallback(async () => {
    if (!canInventoryRead) {
      setMovements([]);
      return;
    }
    setMovementsLoading(true);
    try {
      setMovements(await fetchMovements(MOVEMENTS_LIMIT));
    } catch {
      setMovements([]);
    } finally {
      setMovementsLoading(false);
    }
  }, [canInventoryRead, fetchMovements]);

  const loadSnapshot = useCallback(async () => {
    if (
      !canInventoryRead ||
      selectedVariantId === "" ||
      selectedLocationId === ""
    ) {
      setSnapshot(null);
      return;
    }
    setSnapshotLoading(true);
    try {
      setSnapshot(
        await fetchBalanceSnapshot(selectedVariantId, selectedLocationId),
      );
    } catch {
      setSnapshot(null);
    } finally {
      setSnapshotLoading(false);
    }
  }, [
    canInventoryRead,
    fetchBalanceSnapshot,
    selectedLocationId,
    selectedVariantId,
  ]);

  const loadStockList = useCallback(async () => {
    if (!canInventoryRead || stockLocationId === "") {
      setStockList(null);
      return;
    }
    setStockListLoading(true);
    setStockListError("");
    try {
      const result = await fetchBalances({
        search: debouncedStockSearch,
        locationId: stockLocationId,
        includeZero: false,
        limit: STOCK_PAGE_SIZE,
        offset: stockPage * STOCK_PAGE_SIZE,
      });
      setStockList(result);
    } catch (caught) {
      setStockList(null);
      setStockListError(
        caught instanceof Error
          ? caught.message
          : "Stok siyahısı yüklənmədi",
      );
    } finally {
      setStockListLoading(false);
    }
  }, [
    canInventoryRead,
    debouncedStockSearch,
    fetchBalances,
    stockLocationId,
    stockPage,
  ]);

  useEffect(() => {
    void loadMovements();
  }, [loadMovements, refreshKey]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot, refreshKey]);

  useEffect(() => {
    void loadStockList();
  }, [loadStockList, refreshKey]);

  const stockTotalPages = stockList
    ? Math.max(1, Math.ceil(stockList.total / STOCK_PAGE_SIZE))
    : 1;
  const stockCurrentPage = Math.min(stockPage, stockTotalPages - 1);

  useEffect(() => {
    if (stockPage !== stockCurrentPage) {
      setStockPage(stockCurrentPage);
    }
  }, [stockCurrentPage, stockPage]);

  function selectBalanceRow(balance: InventoryBalanceRow) {
    setSelectedVariantId(balance.variantId);
    setSelectedLocationId(balance.locationId);
    setStockLocationId(balance.locationId);
    setTargetQuantityInput("");
    setQuantityInput("");
  }

  function resetFormFields() {
    formRef.current?.reset();
    setSelectedVariantId("");
    setQuantityInput("");
    setTargetQuantityInput("");
    setQuantityMode("target");
    setSelectedLocationId(defaultLocationId);
    setStockLocationId(defaultLocationId);
    setSnapshot(null);
  }

  if (!canAdjust && !canInventoryRead) {
    return (
      <div className="inventory-adjustment-page">
        <p className="pos-empty">
          Qalıq düzəlişi üçün «inventory.adjustment» icazəsi tələb olunur.
        </p>
      </div>
    );
  }

  const adjustmentHistorySection = canInventoryRead ? (
    <aside
      className="operation-card operation-card--no-hover inventory-adjustment-history"
      aria-label="Son düzəliş hərəkətləri"
    >
      <h2>Son düzəliş hərəkətləri</h2>
      {movementsLoading && adjustmentMovements.length === 0 ? (
        <p className="pos-empty">Yüklənir…</p>
      ) : adjustmentMovements.length === 0 ? (
        <p className="pos-empty">Hələ düzəliş qeydi yoxdur.</p>
      ) : (
        <div className="inventory-adjustment-history__table-wrap">
          <div className="inventory-adjustment-history__table-scroll">
            <table className="inventory-balance-table inventory-adjustment-history-table">
              <thead>
                <tr>
                  <th scope="col">Məhsul</th>
                  <th scope="col">Miqdar</th>
                  <th scope="col">Sənəd nömrəsi</th>
                  <th scope="col">Mənbə növü</th>
                  <th scope="col">Səbəb</th>
                  <th scope="col">Düzəliş edən</th>
                  <th scope="col">Tarix</th>
                </tr>
              </thead>
              <tbody>
                {adjustmentMovements.map((movement) => (
                  <tr key={movement.id}>
                    <td data-label="Məhsul">
                      {movement.variant !== null ? (
                        <>
                          <strong>
                            {getBackofficeProductDisplayTitle(
                              movement.variant.product,
                              movement.variant,
                            )}
                          </strong>
                          <span className="inventory-balance-table__meta">
                            {movement.variant.sku}
                            {movement.variant.barcode
                              ? ` · ${movement.variant.barcode}`
                              : ""}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td data-label="Miqdar">
                      <strong>
                        {movement.quantityDelta > 0 ? "+" : ""}
                        {movement.quantityDelta}
                      </strong>
                    </td>
                    <td data-label="Sənəd nömrəsi">
                      <strong>{movement.sourceDocumentId}</strong>
                    </td>
                    <td data-label="Mənbə növü">
                      {getAdjustmentSourceTypeLabel(movement.sourceType)}
                    </td>
                    <td data-label="Səbəb">{movement.reason}</td>
                    <td data-label="Düzəliş edən">
                      {movement.actorStaff !== null ? (
                        <>
                          <strong>{movement.actorStaff.displayName}</strong>
                          <span className="inventory-balance-table__meta">
                            {movement.actorStaff.email}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td data-label="Tarix">
                      <small>{formatDateTime(movement.createdAt)}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </aside>
  ) : null;

  return (
    <div className="inventory-adjustment-page">
      {canInventoryRead ? (
        <section
          className="operation-card inventory-adjustment-stock-board"
          aria-label="Stokdakı qalıqlar"
        >
          <header className="inventory-adjustment-stock-board__header">
            <div>
              <h2>Stokdakı qalıqlar</h2>
              <p className="pos-meta">
                Məntəqə üzrə cari qalığı olan variantları seçin; düzəliş forması
                avtomatik doldurulacaq.
              </p>
            </div>
          </header>
          <div className="inventory-adjustment-stock-board__filters">
            <label
              className="catalog-subcategories-filter"
              htmlFor={stockLocationFieldId}
            >
              <span className="catalog-subcategories-filter__label">
                Məntəqə
              </span>
              <select
                id={stockLocationFieldId}
                value={stockLocationId}
                onChange={(event) => {
                  setStockLocationId(event.target.value);
                  setStockPage(0);
                }}
              >
                {locations.length === 0 ? (
                  <option value="" disabled>
                    Məntəqə yoxdur
                  </option>
                ) : (
                  locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {getInventoryLocationLabel(location)}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label
              className="catalog-subcategories-filter"
              htmlFor={stockSearchFieldId}
            >
              <span className="catalog-subcategories-filter__label">
                Axtarış
              </span>
              <input
                id={stockSearchFieldId}
                type="search"
                value={stockSearchInput}
                onChange={(event) => setStockSearchInput(event.target.value)}
                placeholder="SKU, barkod, model və ya brend"
                autoComplete="off"
              />
            </label>
          </div>
          {stockListError ? (
            <p className="form-error" role="alert">
              {stockListError}
            </p>
          ) : null}
          <div className="inventory-adjustment-stock-table-wrap">
            {stockListLoading && stockList === null ? (
              <p className="pos-empty">Stok siyahısı yüklənir…</p>
            ) : stockList !== null && stockList.items.length === 0 ? (
              <p className="pos-empty">
                {debouncedStockSearch
                  ? "Filtrə uyğun qalıq tapılmadı."
                  : "Bu məntəqədə qeydiyyatlı qalıq yoxdur — aşağıdakı formadan sıfır qalığa düzəliş edə bilərsiniz."}
              </p>
            ) : stockList !== null ? (
              <>
                <div className="inventory-adjustment-stock-table-scroll">
                  <table className="inventory-balance-table inventory-adjustment-stock-table">
                    <thead>
                      <tr>
                        <th scope="col">Məhsul</th>
                        <th scope="col">SKU</th>
                        <th scope="col">Cari qalıq</th>
                        <th scope="col">
                          <span className="sr-only">Seç</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockList.items.map((balance) => {
                        const isSelected =
                          balance.variantId === selectedVariantId &&
                          balance.locationId === selectedLocationId;
                        return (
                          <tr
                            key={balance.id}
                            className={
                              isSelected
                                ? "inventory-adjustment-stock-row is-selected"
                                : "inventory-adjustment-stock-row"
                            }
                          >
                            <td data-label="Məhsul">
                              <strong>
                                {getBackofficeProductDisplayTitle(
                                  balance.variant.product,
                                  balance.variant,
                                )}
                              </strong>
                            </td>
                            <td data-label="SKU">
                              <strong>{balance.variant.sku}</strong>
                            </td>
                            <td data-label="Cari qalıq">
                              <span className="inventory-balance-qty">
                                {balance.onHand}
                              </span>
                              {balance.reserved > 0 ? (
                                <span className="inventory-balance-table__meta">
                                  rezerv: {balance.reserved}
                                </span>
                              ) : null}
                            </td>
                            <td data-label="Seç">
                              <button
                                type="button"
                                className={
                                  isSelected
                                    ? "inventory-adjustment-pick is-active"
                                    : "inventory-adjustment-pick"
                                }
                                aria-pressed={isSelected}
                                onClick={() => selectBalanceRow(balance)}
                              >
                                {isSelected ? "Seçilib" : "Seç"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {stockList.total > STOCK_PAGE_SIZE ? (
                  <nav
                    className="inventory-balance-pagination"
                    aria-label="Stok siyahısı səhifələmə"
                  >
                    <button
                      type="button"
                      disabled={stockPage <= 0 || stockListLoading}
                      onClick={() =>
                        setStockPage((value) => Math.max(0, value - 1))
                      }
                    >
                      Əvvəlki
                    </button>
                    <span>
                      Səhifə {stockPage + 1} / {stockTotalPages}
                    </span>
                    <button
                      type="button"
                      disabled={
                        stockPage + 1 >= stockTotalPages || stockListLoading
                      }
                      onClick={() =>
                        setStockPage((value) =>
                          Math.min(stockTotalPages - 1, value + 1),
                        )
                      }
                    >
                      Növbəti
                    </button>
                  </nav>
                ) : null}
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="inventory-adjustment-layout">
        {canAdjust ? (
          <form
            ref={formRef}
            className="operation-card operation-card--no-hover inventory-adjustment-form"
            aria-label="Qalıq düzəlişi forması"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              if (!hasQuantity || quantityDelta === 0) {
                return;
              }
              const form = new FormData(event.currentTarget);
              if (selectedVariantId !== "") {
                form.set("variantId", selectedVariantId);
              }
              form.set("locationId", selectedLocationId);
              form.set("quantity", String(quantityDelta));
              void run(
                () => onAdjustment(form),
                "Qalıq düzəlişi ledger-ə yazıldı",
                {
                  onSuccess: () => {
                    resetFormFields();
                  },
                },
              );
            }}
          >
            <header className="inventory-adjustment-form__header">
              <h2>Düzəliş forması</h2>
              <p className="pos-meta">
                Stokdakı variantın qalıq miqdarını inventarizasiya nəticəsinə
                uyğunlaşdırın və ya ziyan/korreksiya üçün fərq daxil edin.
                Mənfi düzəliş rezervdən sonra satışa hazır stoku sıfırın altına
                endirməyə icazə vermir.
              </p>
            </header>

            {selectedVariant ? (
              <div
                className="inventory-adjustment-selection"
                aria-live="polite"
              >
                <p className="inventory-adjustment-selection__label">
                  Seçilmiş variant
                </p>
                <p className="inventory-adjustment-selection__title">
                  {selectedVariant.label}
                </p>
                {selectedVariant.barcode ? (
                  <p className="pos-meta">
                    Barkod: {selectedVariant.barcode}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="pos-meta inventory-adjustment-selection-empty">
                Yuxarıdakı stok siyahısından variant seçin.
              </p>
            )}

            <input
              type="hidden"
              name="variantId"
              value={selectedVariantId}
              required
            />

            <fieldset className="inventory-adjustment-fieldset">
              <legend>Qalıq düzəlişi</legend>
              <label htmlFor={locationFieldId}>
                Məntəqə
                <select
                  id={locationFieldId}
                  name="locationId"
                  required
                  value={selectedLocationId}
                  onChange={(event) => {
                    setSelectedLocationId(event.target.value);
                    setStockLocationId(event.target.value);
                    setTargetQuantityInput("");
                  }}
                >
                  {locations.length === 0 ? (
                    <option value="" disabled>
                      Əvvəlcə stok məntəqəsi yaradın
                    </option>
                  ) : (
                    <>
                      <option value="" disabled>
                        Seçin
                      </option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {getInventoryLocationLabel(location)}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </label>

              {canInventoryRead &&
              selectedVariantId !== "" &&
              selectedLocationId !== "" ? (
                <div
                  className="inventory-adjustment-snapshot"
                  aria-live="polite"
                >
                  {snapshotLoading ? (
                    <p className="pos-meta">Cari qalıq yüklənir…</p>
                  ) : snapshot !== null ? (
                    <>
                      <p className="inventory-adjustment-snapshot__title">
                        Cari qalıq (ledger)
                      </p>
                      <dl className="inventory-adjustment-snapshot__grid">
                        <div>
                          <dt>Qalıq miqdarı</dt>
                          <dd>{snapshot.onHand}</dd>
                        </div>
                        <div>
                          <dt>Rezerv</dt>
                          <dd>{snapshot.reserved}</dd>
                        </div>
                        <div>
                          <dt>Satışa hazır</dt>
                          <dd>{snapshot.onHand - snapshot.reserved}</dd>
                        </div>
                      </dl>
                      {hasQuantity && quantityDelta !== 0 ? (
                        <p
                          className={
                            projectedAvailable !== null && projectedAvailable < 0
                              ? "form-error inventory-adjustment-hint"
                              : "inventory-adjustment-hint"
                          }
                        >
                          Düzəlişdən sonra qalıq: {projectedOnHand} · satışa
                          hazır: {projectedAvailable}
                          {projectedAvailable !== null && projectedAvailable < 0
                            ? " (mümkün deyil)"
                            : ""}
                        </p>
                      ) : hasQuantity && quantityDelta === 0 ? (
                        <p className="inventory-adjustment-hint">
                          Daxil etdiyiniz miqdar cari qalıqla eynidir — düzəliş
                          tələb olunmur.
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="pos-meta">
                      Bu variant və məntəqə üçün qeydiyyat yoxdur — düzəliş yeni
                      balans yaradacaq.
                    </p>
                  )}
                </div>
              ) : null}

              <fieldset className="inventory-adjustment-quantity-mode">
                <legend>Miqdar üsulu</legend>
                <label className="inventory-adjustment-mode-option">
                  <input
                    type="radio"
                    name="quantityMode"
                    value="target"
                    checked={quantityMode === "target"}
                    onChange={() => {
                      setQuantityMode("target");
                      setQuantityInput("");
                    }}
                  />
                  <span>
                    <strong>Yeni qalıq miqdarı</strong>
                    <small>Inventarizasiya — saydığınız faktiki miqdar</small>
                  </span>
                </label>
                <label className="inventory-adjustment-mode-option">
                  <input
                    type="radio"
                    name="quantityMode"
                    value="delta"
                    checked={quantityMode === "delta"}
                    onChange={() => {
                      setQuantityMode("delta");
                      setTargetQuantityInput("");
                    }}
                  />
                  <span>
                    <strong>Düzəliş fərqi (+ / −)</strong>
                    <small>Ziyan, itki və ya korreksiya fərqi</small>
                  </span>
                </label>
              </fieldset>

              {quantityMode === "target" ? (
                <label htmlFor={targetQuantityFieldId}>
                  Yeni qalıq miqdarı
                  <input
                    id={targetQuantityFieldId}
                    type="number"
                    step={1}
                    min={0}
                    required
                    value={targetQuantityInput}
                    placeholder="Saydığınız miqdar"
                    onChange={(event) =>
                      setTargetQuantityInput(event.target.value)
                    }
                  />
                </label>
              ) : (
                <label htmlFor={quantityFieldId}>
                  Miqdar (+ / −)
                  <input
                    id={quantityFieldId}
                    name="quantity"
                    type="number"
                    step={1}
                    required
                    value={quantityInput}
                    placeholder="Məs: -2 və ya 3"
                    onChange={(event) => setQuantityInput(event.target.value)}
                  />
                </label>
              )}

              <label>
                Mənbə növü
                <select name="sourceType" required defaultValue="STOCK_COUNT">
                  {ADJUSTMENT_SOURCE_TYPES.map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sənəd nömrəsi
                <input
                  name="sourceDocumentId"
                  required
                  defaultValue={defaultAdjustmentDocumentId()}
                  autoComplete="off"
                />
              </label>
              <label>
                Səbəb
                <textarea
                  name="reason"
                  minLength={3}
                  required
                  placeholder="Məsələn: inventarizasiya fərqi"
                />
              </label>
            </fieldset>

            <footer className="catalog-subcategories-form__actions inventory-adjustment-form__actions">
              <button
                type="submit"
                className="inventory-adjustment-form__action-btn inventory-adjustment-form__action-btn--submit"
                disabled={
                  locations.length === 0 ||
                  selectedVariantId === "" ||
                  selectedLocationId === "" ||
                  !hasQuantity ||
                  quantityDelta === 0 ||
                  (projectedAvailable !== null && projectedAvailable < 0)
                }
              >
                Düzəliş et
              </button>
              <button
                type="button"
                className="inventory-adjustment-form__action-btn inventory-adjustment-form__action-btn--clear"
                onClick={resetFormFields}
              >
                Təmizlə
              </button>
            </footer>
          </form>
        ) : (
          <article className="operation-card">
            <h2>Düzəliş forması</h2>
            <p className="pos-empty">
              Qalıq düzəlişi üçün «inventory.adjustment» icazəsi lazımdır.
            </p>
          </article>
        )}

        {adjustmentHistorySection}
      </div>
    </div>
  );
}
