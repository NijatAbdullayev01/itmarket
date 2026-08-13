"use client";

import { getProductImageAlt, getProductImageUrl } from "@itmarket/ui";
import { useEffect, useState } from "react";

export type CampaignProductPreview = {
  id: string;
  name: string;
  slug: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  brand: { id?: string; name: string } | null;
  media: Array<{
    id: string;
    objectKey: string;
    url?: string;
    altText: string;
    mimeType: string;
    byteSize: number;
    sortOrder: number;
  }>;
  price: string | null;
  sku: string | null;
};

export type BestsellerRow = {
  productId: string;
  soldQty: number;
  product: CampaignProductPreview;
};

type CampaignsBestsellersPanelProps = {
  canCatalogRead: boolean;
  loadBestsellers: () => Promise<{
    windowDays: number;
    items: BestsellerRow[];
  }>;
};

export function CampaignsBestsellersPanel({
  canCatalogRead,
  loadBestsellers,
}: CampaignsBestsellersPanelProps) {
  const [windowDays, setWindowDays] = useState(90);
  const [items, setItems] = useState<BestsellerRow[]>([]);
  const [loading, setLoading] = useState(canCatalogRead);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canCatalogRead) {
      return;
    }

    let cancelled = false;
    void loadBestsellers()
      .then((result) => {
        if (cancelled) {
          return;
        }
        setWindowDays(result.windowDays);
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
            : "Ən çox satanlar yüklənmədi",
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
  }, [canCatalogRead, loadBestsellers]);

  if (!canCatalogRead) {
    return (
      <section className="catalog-section" aria-label="Ən çox satanlar">
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
      aria-label="Ən çox satanlar"
    >
      <article className="catalog-subcategories-board">
        <header className="catalog-banners-placement__head">
          <div>
            <p className="catalog-banners-placement__page">Ana səhifə</p>
            <h2>Ən çox satanlar</h2>
            <p className="catalog-banners-placement__desc">
              Son {windowDays} gündə online sifarişlər və POS satışlarına görə
              sıralanır. Bu siyahı müştəri ana səhifəsində eyni başlıq altında
              avtomatik görünür.
            </p>
          </div>
        </header>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="card-note">Yüklənir…</p>
        ) : items.length === 0 ? (
          <div className="catalog-subcategories-empty">
            <strong>Hələ satış yoxdur</strong>
            <p>
              Satışlar başlayanda ən çox satılan məhsullar burada və ana
              səhifədə görünəcək.
            </p>
          </div>
        ) : (
          <ol className="campaign-product-list">
            {items.map((row, index) => {
              const image = row.product.media[0] ?? null;
              return (
                <li key={row.productId} className="campaign-product-item">
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
                    <span className="pos-meta">
                      Satılan: {row.soldQty} ədəd
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </article>
    </section>
  );
}
