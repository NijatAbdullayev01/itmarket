"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type {
  CatalogSeoCoverageItemContract,
  CatalogSeoCoverageResponseContract,
  CatalogSeoFillMissingResponseContract,
} from "@itmarket/contracts";
import { formatAzDateTime } from "../../lib/format-az-date";

type CatalogSeoCoveragePanelProps = {
  loadCoverage: () => Promise<CatalogSeoCoverageResponseContract>;
  fillMissing: (payload: {
    limit?: number;
    entityTypes?: Array<"product" | "brand" | "category">;
    enableAvailableByOrderForOos?: boolean;
  }) => Promise<CatalogSeoFillMissingResponseContract>;
  run: <T>(
    action: () => Promise<T>,
    success: string,
    options?: { refresh?: boolean },
  ) => Promise<T | null>;
};

const entityLabels = {
  product: "Məhsul",
  brand: "Brend",
  category: "Kateqoriya",
} as const;

function coverageEditHref(item: CatalogSeoCoverageItemContract): string {
  if (item.entityType === "product") {
    return `/catalog/products?view=${encodeURIComponent(item.id)}`;
  }
  if (item.entityType === "brand") {
    return `/catalog/brands?edit=${encodeURIComponent(item.id)}`;
  }
  if (item.parentId) {
    return `/catalog/subcategories?edit=${encodeURIComponent(item.id)}`;
  }
  return `/catalog/categories?edit=${encodeURIComponent(item.id)}`;
}

export function CatalogSeoCoveragePanel({
  loadCoverage,
  fillMissing,
  run,
}: CatalogSeoCoveragePanelProps) {
  const [coverage, setCoverage] =
    useState<CatalogSeoCoverageResponseContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [lastFill, setLastFill] =
    useState<CatalogSeoFillMissingResponseContract | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await loadCoverage();
      setCoverage(next);
    } finally {
      setLoading(false);
    }
  }, [loadCoverage]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const totalGaps =
    coverage?.buckets.reduce((sum, bucket) => sum + bucket.missingAny, 0) ?? 0;

  return (
    <div className="operation-card catalog-seo-coverage">
      <div className="operation-card__head">
        <h2>SEO coverage</h2>
        <p className="pos-meta">
          Boş <code>seoTitle</code> / <code>seoDescription</code> / intro
          sahələrini və stokda olmayan, amma «sifarişlə» işarələnməmiş
          variantları buradan izləyin. Doldurma yalnız boş sahələrə yazır —
          mövcud mətnləri dəyişmir.
        </p>
      </div>

      <div className="catalog-seo-coverage__actions">
        <button
          type="button"
          className="bo-btn-reset catalog-subcategories-form__cancel"
          disabled={loading || busy}
          onClick={() => void refresh()}
        >
          Yenilə
        </button>
        <button
          type="button"
          disabled={loading || busy || totalGaps === 0}
          onClick={() => {
            setBusy(true);
            void run(
              () => fillMissing({ limit: 100 }),
              "Boş SEO sahələri dolduruldu",
            ).then((result) => {
              if (result) {
                setLastFill(result);
              }
              return refresh();
            }).finally(() => setBusy(false));
          }}
        >
          Boş SEO-ları doldur (max 100)
        </button>
        <button
          type="button"
          disabled={
            loading ||
            busy ||
            (coverage?.oosWithoutOrderFlag.total ?? 0) === 0
          }
          onClick={() => {
            const confirmed = window.confirm(
              "Stokda 0 olan ACTIVE variantlarda availableByOrder=true təyin edilsin? Bu, Merchant/JSON-LD-də BackOrder göstərəcək. SEO mətnləri dəyişmir.",
            );
            if (!confirmed) {
              return;
            }
            setBusy(true);
            void run(
              () =>
                fillMissing({
                  limit: 100,
                  entityTypes: [],
                  enableAvailableByOrderForOos: true,
                }),
              "OOS variantlar sifarişlə işarələndi",
            ).then((result) => {
              if (result) {
                setLastFill(result);
              }
              return refresh();
            }).finally(() => setBusy(false));
          }}
        >
          OOS → sifarişlə (opt-in)
        </button>
      </div>

      {loading && !coverage ? (
        <p className="pos-meta">Yüklənir…</p>
      ) : null}

      {coverage ? (
        <>
          <p className="pos-meta">
            Hesabat: {formatAzDateTime(coverage.generatedAt)}
            {" · "}
            Ümumi boş SEO: <strong>{totalGaps}</strong>
            {" · "}
            OOS flagsız:{" "}
            <strong>{coverage.oosWithoutOrderFlag.total}</strong>
          </p>

          <div className="catalog-seo-coverage__buckets">
            {coverage.buckets.map((bucket) => (
              <section
                key={bucket.entityType}
                className="catalog-seo-coverage__bucket"
              >
                <h3>
                  {entityLabels[bucket.entityType]}{" "}
                  <span className="pos-meta">
                    ({bucket.missingAny}/{bucket.totalActive} boş)
                  </span>
                </h3>
                <ul className="pos-meta">
                  <li>seoTitle: {bucket.missingSeoTitle}</li>
                  <li>seoDescription: {bucket.missingSeoDescription}</li>
                  <li>description: {bucket.missingDescription}</li>
                </ul>
                {bucket.samples.length > 0 ? (
                  <ul className="catalog-seo-coverage__samples">
                    {bucket.samples.map((item) => (
                      <li key={item.id}>
                        <Link href={coverageEditHref(item)}>
                          <strong>{item.name}</strong>
                        </Link>
                        <span className="pos-meta">
                          {" "}
                          · {item.slug} · {item.missing.join(", ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pos-meta">Boşluq yoxdur.</p>
                )}
              </section>
            ))}
          </div>

          {coverage.oosWithoutOrderFlag.samples.length > 0 ? (
            <section className="catalog-seo-coverage__oos">
              <h3>OOS, availableByOrder=false (nümunə)</h3>
              <ul className="catalog-seo-coverage__samples">
                {coverage.oosWithoutOrderFlag.samples.map((item) => (
                  <li key={item.variantId}>
                    <Link
                      href={`/catalog/products?view=${encodeURIComponent(item.productId)}`}
                    >
                      <strong>{item.productName}</strong>
                    </Link>
                    <span className="pos-meta">
                      {" "}
                      · {item.sku} · /products/{item.productSlug}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      {lastFill ? (
        <p className="pos-meta">
          Son doldurma: {lastFill.filled.length} yazı, qalan boşluq{" "}
          {lastFill.remainingGaps}
          {lastFill.availableByOrderEnabled > 0
            ? `, availableByOrder ${lastFill.availableByOrderEnabled}`
            : ""}
          .
        </p>
      ) : null}
    </div>
  );
}
