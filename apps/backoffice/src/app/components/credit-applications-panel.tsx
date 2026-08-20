"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  StaffCreditApplicationStatus,
  StaffCreditApplicationSummaryContract,
} from "@itmarket/contracts";

import {
  ADMIN_TABLE_PAGE_SIZE,
  catalogProductListPageCount,
  clampCatalogProductListPage,
  sliceCatalogProductListPage,
} from "../../lib/catalog-product-list-pagination";
import { formatAzDateTime } from "../../lib/format-az-date";
import { CatalogProductsPagination } from "./catalog-products-pagination";

type StatusFilter = StaffCreditApplicationStatus | "ALL";

type CreditApplicationsPanelProps = {
  applications: StaffCreditApplicationSummaryContract[];
  canManage: boolean;
  onUpdateStatus: (
    id: string,
    status: StaffCreditApplicationStatus,
  ) => Promise<void>;
};

const STATUS_LABELS: Record<StaffCreditApplicationStatus, string> = {
  PENDING: "Gözləyir",
  PROCESSING: "Emal olunur",
  APPROVED: "Təsdiqlənib",
  REJECTED: "Rədd edilib",
};

function nextActions(
  status: StaffCreditApplicationStatus,
): StaffCreditApplicationStatus[] {
  if (status === "PENDING") {
    return ["PROCESSING", "REJECTED"];
  }
  if (status === "PROCESSING") {
    return ["APPROVED", "REJECTED"];
  }
  return [];
}

export function CreditApplicationsPanel({
  applications,
  canManage,
  onUpdateStatus,
}: CreditApplicationsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("az");
    return applications.filter((row) => {
      if (statusFilter !== "ALL" && row.status !== statusFilter) {
        return false;
      }
      if (query === "") {
        return true;
      }
      const haystack = [
        row.phone,
        row.email,
        row.finCode,
        row.productName,
        row.variantName,
        row.variantSku,
        row.customerName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("az");
      return haystack.includes(query);
    });
  }, [applications, searchQuery, statusFilter]);

  const totalPages = catalogProductListPageCount(
    filtered.length,
    ADMIN_TABLE_PAGE_SIZE,
  );
  const safePage = clampCatalogProductListPage(
    page,
    filtered.length,
    ADMIN_TABLE_PAGE_SIZE,
  );
  const pageRows = useMemo(
    () => sliceCatalogProductListPage(filtered, safePage, ADMIN_TABLE_PAGE_SIZE),
    [filtered, safePage],
  );

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  function applySearchQuery(nextQuery: string) {
    setSearchQuery(nextQuery);
    setPage(1);
  }

  function applyStatusFilter(nextFilter: StatusFilter) {
    setStatusFilter(nextFilter);
    setPage(1);
  }

  const pendingCount = useMemo(
    () => applications.filter((row) => row.status === "PENDING").length,
    [applications],
  );

  async function handleStatusUpdate(
    id: string,
    status: StaffCreditApplicationStatus,
  ) {
    setPendingId(id);
    try {
      await onUpdateStatus(id, status);
    } finally {
      setPendingId(null);
    }
  }

  if (!canManage) {
    return (
      <section className="catalog-section" aria-label="Kredit müraciətləri">
        <article className="operation-card">
          <h2>Giriş icazəsi yoxdur</h2>
          <p className="card-note">
            Bu səhifəyə yalnız <code>credit-applications.manage</code> icazəsi
            olan əməkdaşlar daxil ola bilər.
          </p>
        </article>
      </section>
    );
  }

  return (
    <section className="catalog-section" aria-label="Kredit müraciətləri">
      <div className="catalog-metrics" aria-label="Kredit statistikası">
        <article className="catalog-metric catalog-metric--accent">
          <span className="catalog-metric__label">Gözləyən</span>
          <strong className="catalog-metric__value">{pendingCount}</strong>
        </article>
        <article className="catalog-metric">
          <span className="catalog-metric__label">Siyahıda</span>
          <strong className="catalog-metric__value">{filtered.length}</strong>
        </article>
      </div>

      <article className="operation-card operation-card--no-hover">
        <header className="catalog-subcategories-toolbar">
          <div className="catalog-subcategories-toolbar__filters">
            <label className="catalog-subcategories-filter">
              <span className="catalog-subcategories-filter__label">Status</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  applyStatusFilter(event.target.value as StatusFilter)
                }
              >
                <option value="PENDING">Gözləyir</option>
                <option value="PROCESSING">Emal olunur</option>
                <option value="APPROVED">Təsdiqlənib</option>
                <option value="REJECTED">Rədd edilib</option>
                <option value="ALL">Hamısı</option>
              </select>
            </label>
            <label className="catalog-subcategories-filter">
              <span className="catalog-subcategories-filter__label">Axtarış</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => applySearchQuery(event.target.value)}
                placeholder="FIN, telefon, e-poçt, məhsul və ya SKU"
                autoComplete="off"
              />
            </label>
          </div>
        </header>

        {filtered.length === 0 ? (
          <p className="card-note">
            {applications.length === 0
              ? "Hələ heç bir kredit müraciəti yoxdur."
              : "Filterə uyğun müraciət tapılmadı."}
          </p>
        ) : (
          <div className="inventory-balance-table-wrap">
            <div className="inventory-balance-table-scroll">
              <table className="inventory-balance-table">
                <thead>
                  <tr>
                    <th scope="col">Tarix</th>
                    <th scope="col">Məhsul</th>
                    <th scope="col">FIN</th>
                    <th scope="col">Əlaqə</th>
                    <th scope="col">Məbləğ</th>
                    <th scope="col">Status</th>
                    <th scope="col">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => {
                    const actions = nextActions(row.status);
                    const isBusy = pendingId === row.id;
                    return (
                      <tr key={row.id}>
                        <td data-label="Tarix">
                          {formatAzDateTime(row.createdAt, row.createdAt)}
                        </td>
                        <td data-label="Məhsul">
                          <strong>{row.productName}</strong>
                          <span className="inventory-balance-table__meta">
                            {row.variantSku}
                            {row.variantName ? ` · ${row.variantName}` : ""}
                            {` · ×${row.quantity}`}
                          </span>
                        </td>
                        <td data-label="FIN">{row.finCode}</td>
                        <td data-label="Əlaqə">
                          <a href={`tel:${row.phone}`}>{row.phone}</a>
                          {row.email ? (
                            <span className="inventory-balance-table__meta">
                              <a href={`mailto:${row.email}`}>{row.email}</a>
                            </span>
                          ) : null}
                          {row.customerName ? (
                            <span className="inventory-balance-table__meta">
                              {row.customerName}
                            </span>
                          ) : null}
                        </td>
                        <td data-label="Məbləğ">
                          {row.amount} {row.currency}
                        </td>
                        <td data-label="Status">{STATUS_LABELS[row.status]}</td>
                        <td data-label="Əməliyyat">
                          {actions.length === 0 ? (
                            "—"
                          ) : (
                            <div className="inquiries-actions">
                              {actions.map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  className={
                                    status === "REJECTED"
                                      ? "catalog-subcategories-form__cancel"
                                      : "catalog-subcategories-form__submit"
                                  }
                                  disabled={isBusy}
                                  onClick={() =>
                                    void handleStatusUpdate(row.id, status)
                                  }
                                >
                                  {isBusy ? "…" : STATUS_LABELS[status]}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <CatalogProductsPagination
              page={safePage}
              totalPages={totalPages}
              totalItems={filtered.length}
              onPageChange={setPage}
              ariaLabel="Kredit müraciətləri siyahısı səhifələmə"
              pageSize={ADMIN_TABLE_PAGE_SIZE}
            />
          </div>
        )}
      </article>
    </section>
  );
}
