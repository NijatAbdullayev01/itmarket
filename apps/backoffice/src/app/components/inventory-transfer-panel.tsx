"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { formatAzDateTime } from "../../lib/format-az-date";
import {
  getInventoryLocationLabel,
  pickDefaultInventoryLocationId,
} from "../../lib/inventory-location-label";
import { getBackofficeProductDisplayTitle } from "../../lib/product-display-title";

import type {
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

type RunFn = <T>(
  action: () => Promise<T>,
  success: string,
  options?: { refresh?: boolean; onSuccess?: (result: T) => void },
) => Promise<T | null>;

const TRANSFER_SOURCE_TYPES = [
  { value: "TRANSFER", label: "Anbarlar arası" },
  { value: "REPLENISHMENT", label: "Təchizat" },
  { value: "OTHER", label: "Digər" },
] as const;

const MOVEMENTS_LIMIT = 20;

function getTransferSourceTypeLabel(sourceType: string) {
  return (
    TRANSFER_SOURCE_TYPES.find((entry) => entry.value === sourceType)?.label ??
    sourceType
  );
}

function getTransferMovementTypeLabel(type: string) {
  if (type === "TRANSFER_OUT") {
    return "Çıxış";
  }
  if (type === "TRANSFER_IN") {
    return "Giriş";
  }
  return type;
}

function defaultTransferDocumentId() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `TRF-${stamp}-001`;
}

function pickDefaultToLocationId(
  locations: InventoryLocation[],
  fromLocationId: string,
) {
  const other = locations.find((location) => location.id !== fromLocationId);
  return other?.id ?? "";
}

type InventoryTransferPanelProps = {
  products: CatalogProduct[];
  locations: InventoryLocation[];
  canTransfer: boolean;
  canInventoryRead: boolean;
  refreshKey: number;
  run: RunFn;
  fetchMovements: (limit: number) => Promise<InventoryMovementRow[]>;
  onTransfer: (payload: {
    variantId: string;
    fromLocationId: string;
    toLocationId: string;
    quantity: number;
    sourceType: string;
    sourceDocumentId: string;
    reason: string;
  }) => Promise<unknown>;
};

export function InventoryTransferPanel({
  products,
  locations,
  canTransfer,
  canInventoryRead,
  refreshKey,
  run,
  fetchMovements,
  onTransfer,
}: InventoryTransferPanelProps) {
  const variantFieldId = useId();
  const variantSearchFieldId = useId();
  const fromLocationFieldId = useId();
  const toLocationFieldId = useId();
  const formRef = useRef<HTMLFormElement>(null);

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

  const defaultFromLocationId = useMemo(
    () => pickDefaultInventoryLocationId(locations),
    [locations],
  );

  const [fromLocationId, setFromLocationId] = useState(defaultFromLocationId);
  const [toLocationId, setToLocationId] = useState(() =>
    pickDefaultToLocationId(locations, defaultFromLocationId),
  );
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [variantSearch, setVariantSearch] = useState("");
  const [formError, setFormError] = useState("");
  const [detailsKey, setDetailsKey] = useState(0);
  const [movements, setMovements] = useState<InventoryMovementRow[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

  const filteredVariants = useMemo(() => {
    const query = variantSearch.trim().toLocaleLowerCase("az");
    const base =
      query === ""
        ? variantOptions
        : variantOptions.filter((option) => {
            const haystack = [option.label, option.sku, option.barcode ?? ""]
              .join(" ")
              .toLocaleLowerCase("az");
            return haystack.includes(query);
          });
    const selected = variantOptions.find(
      (option) => option.id === selectedVariantId,
    );
    if (
      selected !== undefined &&
      !base.some((option) => option.id === selected.id)
    ) {
      return [selected, ...base];
    }
    return base;
  }, [variantOptions, variantSearch, selectedVariantId]);

  const transferMovements = useMemo(
    () =>
      movements.filter(
        (movement) =>
          movement.type === "TRANSFER_OUT" || movement.type === "TRANSFER_IN",
      ),
    [movements],
  );

  const loadMovements = useCallback(async () => {
    await Promise.resolve();
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

  useEffect(() => {
    queueMicrotask(() => {
      void loadMovements();
    });
  }, [loadMovements, refreshKey]);

  useEffect(() => {
    if (
      fromLocationId === "" &&
      defaultFromLocationId !== ""
    ) {
      setFromLocationId(defaultFromLocationId);
    }
  }, [defaultFromLocationId, fromLocationId]);

  useEffect(() => {
    if (
      toLocationId === "" ||
      toLocationId === fromLocationId
    ) {
      const next = pickDefaultToLocationId(locations, fromLocationId);
      if (next !== "" && next !== toLocationId) {
        setToLocationId(next);
      }
    }
  }, [fromLocationId, locations, toLocationId]);

  function resetFormFields() {
    formRef.current?.reset();
    setSelectedVariantId("");
    setVariantSearch("");
    setFormError("");
    setFromLocationId(defaultFromLocationId);
    setToLocationId(
      pickDefaultToLocationId(locations, defaultFromLocationId),
    );
    setDetailsKey((key) => key + 1);
  }

  if (!canTransfer && !canInventoryRead) {
    return (
      <div className="inventory-transfer-page">
        <p className="pos-empty">
          Stok transferi üçün «inventory.transfer» icazəsi tələb olunur.
        </p>
      </div>
    );
  }

  return (
    <div className="inventory-transfer-page">
      <div className="inventory-transfer-layout">
        {canTransfer ? (
          <form
            ref={formRef}
            className="operation-card operation-card--no-hover inventory-transfer-form"
            aria-label="Stok transferi forması"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              setFormError("");

              if (selectedVariantId === "") {
                setFormError("Variant seçin.");
                return;
              }
              if (fromLocationId === "" || toLocationId === "") {
                setFormError("Mənbə və təyinat məntəqələrini seçin.");
                return;
              }
              if (fromLocationId === toLocationId) {
                setFormError("Mənbə və təyinat məntəqələri fərqli olmalıdır.");
                return;
              }

              const form = new FormData(event.currentTarget);
              const quantity = Number(form.get("quantity"));
              if (
                !Number.isFinite(quantity) ||
                !Number.isInteger(quantity) ||
                quantity < 1
              ) {
                setFormError("Miqdar ən azı 1 olmalıdır.");
                return;
              }

              void run(
                () =>
                  onTransfer({
                    variantId: selectedVariantId,
                    fromLocationId,
                    toLocationId,
                    quantity,
                    sourceType: String(form.get("sourceType") ?? ""),
                    sourceDocumentId: String(
                      form.get("sourceDocumentId") ?? "",
                    ),
                    reason: String(form.get("reason") ?? ""),
                  }),
                "Stok transferi ledger-ə yazıldı",
                {
                  refresh: true,
                  onSuccess: () => {
                    resetFormFields();
                  },
                },
              );
            }}
          >
            <header className="inventory-transfer-form__header">
              <h2>Transfer forması</h2>
              <p className="pos-meta">
                Variantı bir məntəqədən digərinə köçürün. Mövcud satışa hazır
                stok kifayət etmədikdə əməliyyat rədd olunur.
              </p>
            </header>

            <fieldset className="inventory-transfer-fieldset">
              <legend>Məhsul</legend>
              <label htmlFor={variantSearchFieldId}>
                Axtarış
                <input
                  id={variantSearchFieldId}
                  type="search"
                  value={variantSearch}
                  onChange={(event) => setVariantSearch(event.target.value)}
                  placeholder="SKU, barkod, model və ya brend"
                  autoComplete="off"
                />
              </label>
              <label htmlFor={variantFieldId}>
                Variant
                <select
                  id={variantFieldId}
                  name="variantId"
                  required
                  value={selectedVariantId}
                  onChange={(event) => {
                    setSelectedVariantId(event.target.value);
                    setFormError("");
                  }}
                >
                  <option value="" disabled>
                    {filteredVariants.length === 0
                      ? "Uyğun variant yoxdur"
                      : "Seçin"}
                  </option>
                  {filteredVariants.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>

            <fieldset
              key={detailsKey}
              className="inventory-transfer-fieldset"
            >
              <legend>Transfer detalları</legend>
              <div className="inventory-transfer-locations">
                <label htmlFor={fromLocationFieldId}>
                  Mənbə məntəqə
                  <select
                    id={fromLocationFieldId}
                    name="fromLocationId"
                    required
                    value={fromLocationId}
                    onChange={(event) => {
                      const nextFrom = event.target.value;
                      setFromLocationId(nextFrom);
                      if (toLocationId === nextFrom) {
                        setToLocationId(
                          pickDefaultToLocationId(locations, nextFrom),
                        );
                      }
                      setFormError("");
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
                <label htmlFor={toLocationFieldId}>
                  Təyinat məntəqə
                  <select
                    id={toLocationFieldId}
                    name="toLocationId"
                    required
                    value={toLocationId}
                    onChange={(event) => {
                      setToLocationId(event.target.value);
                      setFormError("");
                    }}
                  >
                    {locations.length < 2 ? (
                      <option value="" disabled>
                        Ən azı iki məntəqə lazımdır
                      </option>
                    ) : (
                      <>
                        <option value="" disabled>
                          Seçin
                        </option>
                        {locations.map((location) => (
                          <option
                            key={location.id}
                            value={location.id}
                            disabled={location.id === fromLocationId}
                          >
                            {getInventoryLocationLabel(location)}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </label>
              </div>
              <label>
                Miqdar
                <input
                  name="quantity"
                  type="number"
                  min={1}
                  step={1}
                  required
                />
              </label>
              <label>
                Mənbə növü
                <select name="sourceType" required defaultValue="TRANSFER">
                  {TRANSFER_SOURCE_TYPES.map((entry) => (
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
                  defaultValue={defaultTransferDocumentId()}
                  autoComplete="off"
                />
              </label>
              <label>
                Səbəb
                <textarea
                  name="reason"
                  minLength={3}
                  required
                  placeholder="Məsələn: mağaza təchizatı"
                />
              </label>
              <button
                type="button"
                className="catalog-subcategories-form__cancel inventory-transfer-clear"
                onClick={resetFormFields}
              >
                Təmizlə
              </button>
            </fieldset>

            <footer className="inventory-transfer-form__actions">
              {formError ? (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              ) : null}
              <div className="inventory-transfer-form__actions-buttons">
                <button
                  type="submit"
                  disabled={
                    locations.length < 2 || selectedVariantId === ""
                  }
                >
                  Transfer et
                </button>
              </div>
            </footer>
          </form>
        ) : (
          <article className="operation-card">
            <h2>Transfer forması</h2>
            <p className="pos-empty">
              Transfer əməliyyatı üçün «inventory.transfer» icazəsi lazımdır.
            </p>
          </article>
        )}

        {canInventoryRead ? (
          <aside
            className="operation-card operation-card--no-hover inventory-transfer-history"
            aria-label="Son transfer hərəkətləri"
          >
            <h2>Son transfer hərəkətləri</h2>
            {movementsLoading && transferMovements.length === 0 ? (
              <p className="pos-empty">Yüklənir…</p>
            ) : transferMovements.length === 0 ? (
              <p className="pos-empty">Hələ transfer qeydi yoxdur.</p>
            ) : (
              <div className="inventory-transfer-history__table-wrap">
                <div className="inventory-transfer-history__table-scroll">
                  <table className="inventory-balance-table inventory-transfer-history-table">
                    <thead>
                      <tr>
                        <th scope="col">Məhsul</th>
                        <th scope="col">Növ</th>
                        <th scope="col">Miqdar</th>
                        <th scope="col">Sənəd nömrəsi</th>
                        <th scope="col">Mənbə növü</th>
                        <th scope="col">Səbəb</th>
                        <th scope="col">İcra edən</th>
                        <th scope="col">Tarix</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transferMovements.map((movement) => (
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
                          <td data-label="Növ">
                            {getTransferMovementTypeLabel(movement.type)}
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
                            {getTransferSourceTypeLabel(movement.sourceType)}
                          </td>
                          <td data-label="Səbəb">{movement.reason}</td>
                          <td data-label="İcra edən">
                            {movement.actorStaff !== null ? (
                              <>
                                <strong>
                                  {movement.actorStaff.displayName}
                                </strong>
                                <span className="inventory-balance-table__meta">
                                  {movement.actorStaff.email}
                                </span>
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td data-label="Tarix">
                            <small>
                              {formatAzDateTime(
                                movement.createdAt,
                                movement.createdAt,
                              )}
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
