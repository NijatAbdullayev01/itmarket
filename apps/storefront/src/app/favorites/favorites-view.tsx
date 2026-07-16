"use client";

import { useEffect, useState } from "react";

import {
  Button,
  EmptyState,
  EmptyStateLink,
  IconHeart,
} from "@itmarket/ui";
import { CatalogProductCard } from "@/components/catalog-product-card";
import { useProductFavorites } from "@/hooks/use-product-favorites";
import type { ProductSummary } from "@/lib/api";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"
).replace(/\/+$/, "");

async function fetchProduct(slug: string): Promise<ProductSummary | null> {
  try {
    const response = await fetch(
      `${API_BASE}/storefront/catalog/products/${slug}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    return (await response.json()) as ProductSummary;
  } catch {
    return null;
  }
}

type FavoritesViewProps = {
  cartId?: string;
  cartVariantIds?: string[];
};

export function FavoritesView({
  cartId,
  cartVariantIds = [],
}: FavoritesViewProps) {
  const { items, clear } = useProductFavorites();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      if (items.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const results = await Promise.all(items.map((item) => fetchProduct(item.slug)));
      if (!cancelled) {
        setProducts(results.filter((product): product is ProductSummary => product !== null));
        setLoading(false);
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [items]);

  if (items.length === 0) {
    return (
      <EmptyState
        title="Sevimlilər siyahısı boşdur"
        description="Məhsul səhifəsində ürək düyməsinə basaraq sevimlilərə əlavə edin."
        icon={<IconHeart width={40} height={40} />}
        action={<EmptyStateLink href="/" label="Məhsullara bax" />}
      />
    );
  }

  if (loading) {
    return <p className="ui-compare-status">Məhsullar yüklənir...</p>;
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title="Sevimlilər tapılmadı"
        description="Seçilmiş məhsullar artıq mövcud deyil və ya API əlçatan deyil."
        action={
          <button type="button" className="ui-btn" onClick={clear}>
            Siyahını təmizlə
          </button>
        }
      />
    );
  }

  return (
    <div className="ui-favorites">
      <div className="ui-compare__toolbar">
        <p className="ui-compare__count">{products.length} sevimli məhsul</p>
        <Button type="button" variant="ghost" onClick={clear}>
          Hamısını sil
        </Button>
      </div>

      <div className="ui-product-grid">
        {products.map((product) => (
          <CatalogProductCard
            key={product.id}
            product={product}
            cartId={cartId}
            cartVariantIds={cartVariantIds}
          />
        ))}
      </div>
    </div>
  );
}
