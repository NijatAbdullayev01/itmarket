"use client";

import { useMemo, useState } from "react";

import type {
  StaffAvailabilityRequestNavCountsContract,
  StaffAvailabilityRequestStatus,
  StaffAvailabilityRequestSummaryContract,
  StaffAvailabilityRequestType,
} from "@itmarket/contracts";

import { formatAzDateTime } from "../../lib/format-az-date";

type InquiryStatusFilter = StaffAvailabilityRequestStatus | "ALL";

type InquiriesPanelProps = {
  inquiries: StaffAvailabilityRequestSummaryContract[];
  counts: StaffAvailabilityRequestNavCountsContract | null;
  /** Paneli yalnız bu sorğu növü üçün göstər (sidebar bölmələrinə uyğun). */
  lockedType: StaffAvailabilityRequestType;
  canInquiriesRead: boolean;
  canInquiriesWrite: boolean;
  onUpdateStatus: (
    id: string,
    status: Extract<StaffAvailabilityRequestStatus, "FULFILLED" | "CANCELLED">,
  ) => Promise<void>;
};

const TYPE_LABELS: Record<StaffAvailabilityRequestType, string> = {
  PREORDER: "Sifarişlə",
  STOCK_ALERT: "Mövcud olanda bildir",
};

const STATUS_LABELS: Record<StaffAvailabilityRequestStatus, string> = {
  PENDING: "Gözləyir",
  FULFILLED: "Bağlanıb",
  CANCELLED: "Ləğv edilib",
};

const EMPTY_COPY: Record<StaffAvailabilityRequestType, string> = {
  PREORDER:
    "Hələ heç bir sorğu yoxdur. Müştəri storefront-da sifarişlə formu göndərəndə burada görünəcək.",
  STOCK_ALERT:
    "Hələ heç bir sorğu yoxdur. Müştəri storefront-da «Mövcud olanda bildir» formu göndərəndə burada görünəcək.",
};

export function InquiriesPanel({
  inquiries,
  counts,
  lockedType,
  canInquiriesRead,
  canInquiriesWrite,
  onUpdateStatus,
}: InquiriesPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<InquiryStatusFilter>("PENDING");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const typeInquiries = useMemo(
    () => inquiries.filter((inquiry) => inquiry.type === lockedType),
    [inquiries, lockedType],
  );

  const filteredInquiries = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("az");

    return typeInquiries.filter((inquiry) => {
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
  }, [typeInquiries, searchQuery, statusFilter]);

  const pendingCount = useMemo(() => {
    if (lockedType === "PREORDER") {
      return (
        counts?.pendingPreorders ??
        typeInquiries.filter((inquiry) => inquiry.status === "PENDING").length
      );
    }
    return (
      counts?.pendingStockAlerts ??
      typeInquiries.filter((inquiry) => inquiry.status === "PENDING").length
    );
  }, [counts, lockedType, typeInquiries]);

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

  const sectionLabel = TYPE_LABELS[lockedType];

  if (!canInquiriesRead) {
    return (
      <section className="catalog-section" aria-label={sectionLabel}>
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
    <section className="catalog-section" aria-label={sectionLabel}>
      <div className="catalog-metrics" aria-label="Sorğu statistikası">
        <article className="catalog-metric catalog-metric--accent">
          <span className="catalog-metric__label">
            {lockedType === "PREORDER"
              ? "Gözləyən sifarişlə"
              : "Gözləyən bildiriş"}
          </span>
          <strong className="catalog-metric__value">{pendingCount}</strong>
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
            {typeInquiries.length === 0
              ? EMPTY_COPY[lockedType]
              : "Filterə uyğun sorğu tapılmadı."}
          </p>
        ) : (
          <div className="inventory-balance-table-wrap">
            <div className="inventory-balance-table-scroll">
              <table className="inventory-balance-table">
                <thead>
                  <tr>
                    <th scope="col">Tarix</th>
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
                        <td data-label="Tarix">
                          {formatAzDateTime(inquiry.createdAt, inquiry.createdAt)}
                        </td>
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
