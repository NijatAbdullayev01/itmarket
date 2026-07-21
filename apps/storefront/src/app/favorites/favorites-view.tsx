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
import {
  ApiError,
  fetchProductDetail,
  type ProductDetail,
  type ProductSummary,
} from "@/lib/api";
import { projectProductDetailForVariant } from "@/lib/project-product-for-variant";

async function fetchFavoriteProduct(
  item: { slug: string; variantId: string },
): Promise<ProductSummary | null> {
  try {
    const detail = await fetchProductDetail(item.slug);
    return projectProductDetailForVariant(detail, item.variantId);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      return null;
    }
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
      const results = await Promise.all(
        items.map((item) => fetchFavoriteProduct(item)),
      );
      if (!cancelled) {
        setProducts(
          results.filter((product): product is ProductDetail => product !== null),
        );
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
            key={product.defaultVariantId ?? product.id}
            product={product}
            cartId={cartId}
            cartVariantIds={cartVariantIds}
          />
        ))}
      </div>
    </div>
  );
}
