"use client";

import { useMemo, useState } from "react";

import type { StaffProductReviewSummaryContract } from "@itmarket/contracts";

import { formatAzDateTime } from "../../lib/format-az-date";

type PublishedFilter = "ALL" | "PUBLISHED" | "UNPUBLISHED";

type ProductReviewsPanelProps = {
  reviews: StaffProductReviewSummaryContract[];
  canModerate: boolean;
  onSetPublished: (id: string, published: boolean) => Promise<void>;
};

export function ProductReviewsPanel({
  reviews,
  canModerate,
  onSetPublished,
}: ProductReviewsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [publishedFilter, setPublishedFilter] =
    useState<PublishedFilter>("UNPUBLISHED");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("az");
    return reviews.filter((row) => {
      if (publishedFilter === "PUBLISHED" && !row.published) {
        return false;
      }
      if (publishedFilter === "UNPUBLISHED" && row.published) {
        return false;
      }
      if (query === "") {
        return true;
      }
      const haystack = [
        row.productName,
        row.variantName,
        row.variantSku,
        row.customerName,
        row.comment,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("az");
      return haystack.includes(query);
    });
  }, [publishedFilter, reviews, searchQuery]);

  const unpublishedCount = useMemo(
    () => reviews.filter((row) => !row.published).length,
    [reviews],
  );

  async function handlePublishToggle(id: string, published: boolean) {
    setPendingId(id);
    try {
      await onSetPublished(id, published);
    } finally {
      setPendingId(null);
    }
  }

  if (!canModerate) {
    return (
      <section className="catalog-section" aria-label="Məhsul rəyləri">
        <article className="operation-card">
          <h2>Giriş icazəsi yoxdur</h2>
          <p className="card-note">
            Bu səhifəyə yalnız <code>catalog.write</code> icazəsi olan əməkdaşlar
            daxil ola bilər.
          </p>
        </article>
      </section>
    );
  }

  return (
    <section className="catalog-section" aria-label="Məhsul rəyləri">
      <div className="catalog-metrics" aria-label="Rəy statistikası">
        <article className="catalog-metric catalog-metric--accent">
          <span className="catalog-metric__label">Gözləyən</span>
          <strong className="catalog-metric__value">{unpublishedCount}</strong>
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
                value={publishedFilter}
                onChange={(event) =>
                  setPublishedFilter(event.target.value as PublishedFilter)
                }
              >
                <option value="UNPUBLISHED">Gözləyir</option>
                <option value="PUBLISHED">Dərc olunub</option>
                <option value="ALL">Hamısı</option>
              </select>
            </label>
            <label className="catalog-subcategories-filter">
              <span className="catalog-subcategories-filter__label">Axtarış</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Məhsul, SKU, müştəri və ya rəy"
                autoComplete="off"
              />
            </label>
          </div>
        </header>

        {filtered.length === 0 ? (
          <p className="card-note">
            {reviews.length === 0
              ? "Hələ heç bir məhsul rəyi yoxdur."
              : "Filterə uyğun rəy tapılmadı."}
          </p>
        ) : (
          <div className="inventory-balance-table-wrap">
            <div className="inventory-balance-table-scroll">
              <table className="inventory-balance-table">
                <thead>
                  <tr>
                    <th scope="col">Tarix</th>
                    <th scope="col">Məhsul</th>
                    <th scope="col">Reytinq</th>
                    <th scope="col">Rəy</th>
                    <th scope="col">Müştəri</th>
                    <th scope="col">Status</th>
                    <th scope="col">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
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
                          </span>
                        </td>
                        <td data-label="Reytinq">{row.rating}/5</td>
                        <td data-label="Rəy">
                          {row.comment?.trim() ? row.comment : "—"}
                        </td>
                        <td data-label="Müştəri">
                          {row.customerName ?? "—"}
                        </td>
                        <td data-label="Status">
                          {row.published ? "Dərc olunub" : "Gözləyir"}
                        </td>
                        <td data-label="Əməliyyat">
                          <div className="inquiries-actions">
                            <button
                              type="button"
                              className={
                                row.published
                                  ? "catalog-subcategories-form__cancel"
                                  : "catalog-subcategories-form__submit"
                              }
                              disabled={isBusy}
                              onClick={() =>
                                void handlePublishToggle(row.id, !row.published)
                              }
                            >
                              {isBusy
                                ? "…"
                                : row.published
                                  ? "Gizlət"
                                  : "Dərc et"}
                            </button>
                          </div>
                        </td>
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
