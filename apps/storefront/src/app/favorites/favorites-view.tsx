"use client";

import { useEffect, useState } from "react";

import {
  Button,
  EmptyState,
  EmptyStateLink,
  IconHeart,
  PageLoading,
} from "@itmarket/ui";
import { CatalogProductCard } from "@/components/catalog-product-card";
import { useMessages } from "@/components/locale-provider";
import { formatMessage } from "@/lib/i18n";
import { useIsClient } from "@/hooks/use-is-client";
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
  const hydrated = useIsClient();
  const { items, clear } = useProductFavorites();
  const messages = useMessages();
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

  if (!hydrated) {
    return (
      <div
        className="ui-local-pending"
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="sr-only">{messages.favorites.loading}</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title={messages.favorites.emptyTitle}
        description={messages.favorites.emptyDescription}
        icon={<IconHeart width={40} height={40} />}
        action={<EmptyStateLink href="/" label={messages.common.viewProducts} />}
      />
    );
  }

  if (loading) {
    return (
      <PageLoading
        variant="favorites"
        label={messages.favorites.loading}
        showTitle={false}
        framed={false}
      />
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title={messages.favorites.dataMissingTitle}
        description={messages.favorites.dataMissingDescription}
        action={
          <button type="button" className="ui-btn" onClick={clear}>
            {messages.compare.clearList}
          </button>
        }
      />
    );
  }

  return (
    <div className="ui-favorites">
      <div className="ui-compare__toolbar">
        <p className="ui-compare__count">{formatMessage(messages.favorites.countLabel, { count: products.length })}</p>
        <Button type="button" variant="ghost" onClick={clear}>
          {messages.favorites.clearAll}
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
