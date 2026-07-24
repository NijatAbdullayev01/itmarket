"use client";

import { useMemo, useState } from "react";

import type {
  StaffAvailabilityRequestNavCountsContract,
  StaffAvailabilityRequestStatus,
  StaffAvailabilityRequestSummaryContract,
  StaffAvailabilityRequestType,
} from "@itmarket/contracts";

type InquiryTypeFilter = "PREORDER" | "STOCK_ALERT" | "ALL";
type InquiryStatusFilter = StaffAvailabilityRequestStatus | "ALL";

type InquiriesPanelProps = {
  inquiries: StaffAvailabilityRequestSummaryContract[];
  counts: StaffAvailabilityRequestNavCountsContract | null;
  canInquiriesRead: boolean;
  canInquiriesWrite: boolean;
  onUpdateStatus: (
    id: string,
    status: Extract<StaffAvailabilityRequestStatus, "FULFILLED" | "CANCELLED">,
  ) => Promise<void>;
};

const TYPE_LABELS: Record<StaffAvailabilityRequestType, string> = {
  PREORDER: "Ön sifariş",
  STOCK_ALERT: "Stok bildirişi",
};

const STATUS_LABELS: Record<StaffAvailabilityRequestStatus, string> = {
  PENDING: "Gözləyir",
  FULFILLED: "Bağlanıb",
  CANCELLED: "Ləğv edilib",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("az-AZ", {
    timeZone: "Asia/Baku",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function InquiriesPanel({
  inquiries,
  counts,
  canInquiriesRead,
  canInquiriesWrite,
  onUpdateStatus,
}: InquiriesPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<InquiryTypeFilter>("PREORDER");
  const [statusFilter, setStatusFilter] =
    useState<InquiryStatusFilter>("PENDING");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filteredInquiries = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("az");

    return inquiries.filter((inquiry) => {
      if (typeFilter !== "ALL" && inquiry.type !== typeFilter) {
        return false;
      }
      if (statusFilter !== "ALL" && inquiry.status !== statusFilter) {
        return false;
      }
      if (query === "") {
        return true;
      }

      const haystack = [
        inquiry.phone,
        inquiry.email,
        inquiry.productName,
        inquiry.variantName,
        inquiry.variantSku,
        inquiry.customerName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("az");
      return haystack.includes(query);
    });
  }, [inquiries, searchQuery, statusFilter, typeFilter]);

  const pendingPreorderCount = useMemo(
    () =>
      counts?.pendingPreorders ??
      inquiries.filter(
        (inquiry) =>
          inquiry.type === "PREORDER" && inquiry.status === "PENDING",
      ).length,
    [counts, inquiries],
  );

  const pendingStockAlertCount = useMemo(
    () =>
      counts?.pendingStockAlerts ??
      inquiries.filter(
        (inquiry) =>
          inquiry.type === "STOCK_ALERT" && inquiry.status === "PENDING",
      ).length,
    [counts, inquiries],
  );

  async function handleStatusUpdate(
    id: string,
    status: Extract<StaffAvailabilityRequestStatus, "FULFILLED" | "CANCELLED">,
  ) {
    setPendingId(id);
    try {
      await onUpdateStatus(id, status);
    } finally {
      setPendingId(null);
    }
  }

  if (!canInquiriesRead) {
    return (
      <section className="catalog-section" aria-label="Sorğular">
        <article className="operation-card">
          <h2>Giriş icazəsi yoxdur</h2>
          <p className="card-note">
            Bu səhifəyə yalnız <code>inquiries.read</code> icazəsi olan
            əməkdaşlar daxil ola bilər.
          </p>
        </article>
      </section>
    );
  }

  return (
    <section className="catalog-section" aria-label="Sorğular">
      <div className="catalog-metrics" aria-label="Sorğu statistikası">
        <article className="catalog-metric catalog-metric--accent">
          <span className="catalog-metric__label">Gözləyən ön sifariş</span>
          <strong className="catalog-metric__value">
            {pendingPreorderCount}
          </strong>
        </article>
        <article className="catalog-metric">
          <span className="catalog-metric__label">Gözləyən stok bildirişi</span>
          <strong className="catalog-metric__value">
            {pendingStockAlertCount}
          </strong>
        </article>
        <article className="catalog-metric">
          <span className="catalog-metric__label">Siyahıda</span>
          <strong className="catalog-metric__value">
            {filteredInquiries.length}
          </strong>
        </article>
      </div>

      <article className="operation-card operation-card--no-hover">
        <header className="catalog-subcategories-toolbar">
          <div className="catalog-subcategories-toolbar__filters">
            <label className="catalog-subcategories-filter">
              <span className="catalog-subcategories-filter__label">Növ</span>
              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as InquiryTypeFilter)
                }
              >
                <option value="PREORDER">Ön sifariş</option>
                <option value="STOCK_ALERT">Stok bildirişi</option>
                <option value="ALL">Hamısı</option>
              </select>
            </label>
            <label className="catalog-subcategories-filter">
              <span className="catalog-subcategories-filter__label">Status</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as InquiryStatusFilter)
                }
              >
                <option value="PENDING">Gözləyir</option>
                <option value="FULFILLED">Bağlanıb</option>
                <option value="CANCELLED">Ləğv edilib</option>
                <option value="ALL">Hamısı</option>
              </select>
            </label>
            <label className="catalog-subcategories-filter">
              <span className="catalog-subcategories-filter__label">Axtarış</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Telefon, e-poçt, məhsul və ya SKU"
                autoComplete="off"
              />
            </label>
          </div>
        </header>

        {filteredInquiries.length === 0 ? (
          <p className="card-note">
            {inquiries.length === 0
              ? "Hələ heç bir sorğu yoxdur. Müştəri storefront-da ön sifariş formu göndərəndə burada görünəcək."
              : "Filterə uyğun sorğu tapılmadı."}
          </p>
        ) : (
          <div className="inventory-balance-table-wrap">
            <div className="inventory-balance-table-scroll">
              <table className="inventory-balance-table">
                <thead>
                  <tr>
                    <th scope="col">Tarix</th>
                    <th scope="col">Növ</th>
                    <th scope="col">Məhsul</th>
                    <th scope="col">Telefon</th>
                    <th scope="col">E-poçt</th>
                    <th scope="col">Miqdar</th>
                    <th scope="col">Status</th>
                    {canInquiriesWrite ? <th scope="col">Əməliyyat</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {filteredInquiries.map((inquiry) => {
                    const isPending = inquiry.status === "PENDING";
                    const isBusy = pendingId === inquiry.id;

                    return (
                      <tr key={inquiry.id}>
                        <td data-label="Tarix">{formatDate(inquiry.createdAt)}</td>
                        <td data-label="Növ">{TYPE_LABELS[inquiry.type]}</td>
                        <td data-label="Məhsul">
                          <strong>{inquiry.productName}</strong>
                          <span className="inventory-balance-table__meta">
                            {inquiry.variantSku}
                            {inquiry.variantName
                              ? ` · ${inquiry.variantName}`
                              : ""}
                          </span>
                        </td>
                        <td data-label="Telefon">
                          <a href={`tel:${inquiry.phone}`}>{inquiry.phone}</a>
                          {inquiry.customerName ? (
                            <span className="inventory-balance-table__meta">
                              {inquiry.customerName}
                            </span>
                          ) : null}
                        </td>
                        <td data-label="E-poçt">
                          {inquiry.email ? (
                            <a href={`mailto:${inquiry.email}`}>
                              {inquiry.email}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td data-label="Miqdar">{inquiry.quantity}</td>
                        <td data-label="Status">
                          {STATUS_LABELS[inquiry.status]}
                        </td>
                        {canInquiriesWrite ? (
                          <td data-label="Əməliyyat">
                            {isPending ? (
                              <div className="inquiries-actions">
                                <button
                                  type="button"
                                  className="catalog-subcategories-form__submit"
                                  disabled={isBusy}
                                  onClick={() =>
                                    void handleStatusUpdate(
                                      inquiry.id,
                                      "FULFILLED",
                                    )
                                  }
                                >
                                  {isBusy ? "…" : "Bağla"}
                                </button>
                                <button
                                  type="button"
                                  className="catalog-subcategories-form__cancel"
                                  disabled={isBusy}
                                  onClick={() =>
                                    void handleStatusUpdate(
                                      inquiry.id,
                                      "CANCELLED",
                                    )
                                  }
                                >
                                  Ləğv et
                                </button>
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}
