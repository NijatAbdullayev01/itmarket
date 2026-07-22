"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";

export type InventoryLocation = {
  id: string;
  code: string;
  name: string;
  type?: "WAREHOUSE" | "STORE" | "PICKUP";
  active?: boolean;
};

export type InventoryBalanceRow = {
  id: string;
  variantId: string;
  locationId: string;
  onHand: number;
  reserved: number;
  updatedAt: string;
  variant: {
    sku: string;
    barcode: string | null;
    name: string;
    attributes?: unknown;
    product: {
      name: string;
      brand: { id: string; name: string } | null;
    };
  };
  location: { code: string; name: string; type?: string };
  quantityEnteredBy: {
    id: string;
    displayName: string;
    email: string;
  } | null;
  quantityEnteredAt: string | null;
};

export type InventoryBalancePage = {
  items: InventoryBalanceRow[];
  total: number;
  summary: { onHand: number; reserved: number; available: number };
};

export type InventoryMovementRow = {
  id: string;
  type: string;
  quantityDelta: number;
  sourceType: string;
  sourceDocumentId: string;
  reason: string;
  transferGroupId: string | null;
  actorStaff: {
    id: string;
    displayName: string;
    email: string;
  } | null;
  createdAt: string;
  variant: {
    sku: string;
    barcode: string | null;
    name: string;
    attributes?: unknown;
    product: {
      name: string;
      brand: { id: string; name: string } | null;
    };
  } | null;
};

export type InventoryReconciliation = {
  healthy: boolean;
  mismatches: {
    variant_id: string;
    location_id: string;
    balance_on_hand: number;
    ledger_on_hand: string;
  }[];
};

export type InventoryAuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  createdAt: string;
};

import { getInventoryLocationLabel } from "../../lib/inventory-location-label";
import { getBackofficeProductDisplayTitle } from "../../lib/product-display-title";

const PAGE_SIZE = 25;

function formatQuantityEnteredAt(value: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baku",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const day = pick("day");
  const month = pick("month");
  const year = pick("year");
  const hour = pick("hour");
  const minute = pick("minute");

  if (day === "" || month === "" || year === "" || hour === "" || minute === "") {
    return value;
  }

  return `${day}.${month}.${year}, ${hour}:${minute}`;
}

type InventoryBalancePanelProps = {
  locations: InventoryLocation[];
  canInventoryRead: boolean;
  refreshKey: number;
  fetchBalances: (query: {
    search: string;
    locationId: string;
    includeZero: boolean;
    limit: number;
    offset: number;
  }) => Promise<InventoryBalancePage>;
};

export function InventoryBalancePanel({
  locations,
  canInventoryRead,
  refreshKey,
  fetchBalances,
}: InventoryBalancePanelProps) {
  const searchFieldId = useId();
  const locationFilterId = useId();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [page, setPage] = useState(0);
  const [balancePage, setBalancePage] = useState<InventoryBalancePage | null>(
    null,
  );
  const [listError, setListError] = useState("");
  const [listLoading, setListLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(0);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadBalances = useCallback(async () => {
    if (!canInventoryRead) {
      setBalancePage(null);
      return;
    }
    setListLoading(true);
    setListError("");
    try {
      const result = await fetchBalances({
        search: debouncedSearch,
        locationId: locationFilter,
        includeZero: true,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setBalancePage(result);
    } catch (caught) {
      setBalancePage(null);
      setListError(
        caught instanceof Error ? caught.message : "Balans siyahısı yüklənmədi",
      );
    } finally {
      setListLoading(false);
    }
  }, [
    canInventoryRead,
    debouncedSearch,
    fetchBalances,
    locationFilter,
    page,
  ]);

  useEffect(() => {
    void loadBalances();
  }, [loadBalances, refreshKey]);

  const totalPages = balancePage
    ? Math.max(1, Math.ceil(balancePage.total / PAGE_SIZE))
    : 1;
  const currentPage = Math.min(page, totalPages - 1);

  useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage);
    }
  }, [currentPage, page]);

  if (!canInventoryRead) {
    return null;
  }

  return (
    <div className="inventory-balance-page">
      <div className="inventory-balance-board">
        <header className="catalog-subcategories-toolbar inventory-balance-toolbar">
          <div className="catalog-subcategories-toolbar__filters inventory-balance-toolbar__filters">
            <label
              className="catalog-subcategories-filter"
              htmlFor={searchFieldId}
            >
              <span className="catalog-subcategories-filter__label">
                Axtarış
              </span>
              <input
                id={searchFieldId}
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="SKU, barkod, model və ya brend"
                autoComplete="off"
              />
            </label>
            <label
              className="catalog-subcategories-filter"
              htmlFor={locationFilterId}
            >
              <span className="catalog-subcategories-filter__label">
                Məntəqə
              </span>
              <select
                id={locationFilterId}
                value={locationFilter}
                onChange={(event) => {
                  setLocationFilter(event.target.value);
                  setPage(0);
                }}
              >
                <option value="">Hamısı</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {getInventoryLocationLabel(location)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        {listError ? (
          <p className="form-error inventory-balance-list-error" role="alert">
            {listError}
          </p>
        ) : null}

        <div className="inventory-balance-table-wrap">
          {listLoading && balancePage === null ? (
            <p className="pos-empty">Qalıqlar yüklənir…</p>
          ) : balancePage !== null && balancePage.items.length === 0 ? (
            <div className="catalog-subcategories-empty">
              <strong>Qalıq tapılmadı</strong>
              <p>
                {debouncedSearch || locationFilter
                  ? "Filtr parametrlərini dəyişdirin və ya «Məhsul qəbulu» səhifəsindən stok qəbul edin."
                  : "«Məhsul qəbulu» və ya «Qalıq düzəlişi» ilə qalıq yaradın."}
              </p>
            </div>
          ) : balancePage !== null ? (
            <>
              <div className="inventory-balance-table-scroll">
                <table className="inventory-balance-table">
                  <thead>
                    <tr>
                      <th scope="col">Məhsul</th>
                      <th scope="col">SKU</th>
                      <th scope="col">Barkod</th>
                      <th scope="col">Məntəqə</th>
                      <th scope="col">Qalıq miqdarı</th>
                      <th scope="col">Miqdarı daxil edən şəxs</th>
                      <th scope="col">Daxil edilmə tarixi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balancePage.items.map((balance) => (
                      <tr key={balance.id}>
                        <td data-label="Məhsul">
                          <strong>
                            {getBackofficeProductDisplayTitle(
                              balance.variant.product,
                              balance.variant,
                            )}
                          </strong>
                          <span className="inventory-balance-table__meta">
                            {balance.variant.name}
                          </span>
                        </td>
                        <td data-label="SKU">
                          <strong>{balance.variant.sku}</strong>
                        </td>
                        <td data-label="Barkod">
                          {balance.variant.barcode !== null &&
                          balance.variant.barcode.trim() !== "" ? (
                            balance.variant.barcode
                          ) : (
                            <span className="inventory-balance-table__meta">—</span>
                          )}
                        </td>
                        <td data-label="Məntəqə">
                          {getInventoryLocationLabel(
                            balance.location,
                            locations,
                          )}
                        </td>
                        <td data-label="Qalıq miqdarı">
                          <span
                            className={
                              balance.onHand <= 0
                                ? "inventory-balance-qty is-empty"
                                : "inventory-balance-qty"
                            }
                          >
                            {balance.onHand}
                          </span>
                        </td>
                        <td data-label="Miqdarı daxil edən şəxs">
                          {balance.quantityEnteredBy !== null ? (
                            <>
                              <strong>{balance.quantityEnteredBy.displayName}</strong>
                              <span className="inventory-balance-table__meta">
                                {balance.quantityEnteredBy.email}
                              </span>
                            </>
                          ) : (
                            <span className="inventory-balance-table__meta">—</span>
                          )}
                        </td>
                        <td data-label="Daxil edilmə tarixi">
                          {balance.quantityEnteredAt !== null ? (
                            formatQuantityEnteredAt(balance.quantityEnteredAt)
                          ) : (
                            <span className="inventory-balance-table__meta">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {balancePage.total > PAGE_SIZE ? (
                <nav
                  className="inventory-balance-pagination"
                  aria-label="Qalıq səhifələmə"
                >
                  <button
                    type="button"
                    disabled={page <= 0 || listLoading}
                    onClick={() => setPage((value) => Math.max(0, value - 1))}
                  >
                    Əvvəlki
                  </button>
                  <span>
                    Səhifə {page + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page + 1 >= totalPages || listLoading}
                    onClick={() =>
                      setPage((value) => Math.min(totalPages - 1, value + 1))
                    }
                  >
                    Növbəti
                  </button>
                </nav>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
