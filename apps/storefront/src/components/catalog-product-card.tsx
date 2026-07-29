"use client";

import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductCompareButton } from "@/components/product-compare-button";
import { ProductFavoriteButton } from "@/components/product-favorite-button";
import { ProductPreorderButton } from "@/components/product-preorder-button";
import { useMessages } from "@/components/locale-provider";
import { toProductCardCopy } from "@/lib/i18n";
import { IconCart, ProductCard, getVariantPermanentStorageLabel } from "@itmarket/ui";
import type { ProductSummary } from "@/lib/api";
import { getStorefrontProductDisplayTitleFromSummary } from "@/lib/product-display-title";
import { StorefrontMediaImage } from "@/components/storefront-media-image";

type CatalogProductCardProps = {
  product: ProductSummary;
  cartId?: string;
  cartVariantIds?: string[];
};

export function CatalogProductCard({
  product,
  cartId,
  cartVariantIds = [],
}: CatalogProductCardProps) {
  const messages = useMessages();
  const displayTitle = getStorefrontProductDisplayTitleFromSummary(product);
  const permanentStorage = getVariantPermanentStorageLabel(
    product.variantAttributes ?? {},
    product.variantName,
  );
  const variantId = product.defaultVariantId;
  const productHref =
    variantId === null
      ? `/products/${product.slug}`
      : `/products/${product.slug}?variant=${variantId}`;
  const canQuickAdd =
    product.available > 0 && variantId !== null;
  const isOutOfStock = product.available <= 0 && variantId !== null;
  const canOrderByRequest =
    isOutOfStock && product.availableByOrder === true;
  const canNotifyWhenAvailable =
    isOutOfStock && product.availableByOrder !== true;
  const defaultVariantId = variantId!;
  const inCart = cartVariantIds.includes(defaultVariantId);

  const addToCartSlot = canQuickAdd ? (
    <AddToCartButton
      cartId={cartId}
      variantId={defaultVariantId}
      inCart={inCart}
      className="ui-btn ui-btn--cta ui-btn--block ui-product-card__cta"
    >
      <IconCart width={18} height={18} />
      <span className="ui-product-card__cta-text">
        <span className="ui-product-card__cta-text--full">{messages.product.addToCartShort}</span>
        <span className="ui-product-card__cta-text--short" aria-hidden="true">
          {messages.product.addToCartShort}
        </span>
      </span>
    </AddToCartButton>
  ) : undefined;

  const preorderSlot = canOrderByRequest ? (
    <ProductPreorderButton
      productId={product.id}
      productName={displayTitle}
      variantId={defaultVariantId}
      variantName={product.variantName}
      mode="preorder"
      label={messages.product.preorder}
      className="ui-btn ui-btn--cta ui-btn--block ui-product-card__cta"
    />
  ) : canNotifyWhenAvailable ? (
    <ProductPreorderButton
      productId={product.id}
      productName={displayTitle}
      variantId={defaultVariantId}
      variantName={product.variantName}
      mode="stock_alert"
      label={messages.product.notifyWhenAvailable}
      shortLabel={messages.product.notifyWhenAvailableShort}
      className="ui-btn ui-btn--cta ui-btn--block ui-product-card__cta"
    />
  ) : undefined;

  return (
    <ProductCard
      slug={product.slug}
      href={productHref}
      name={displayTitle}
      permanentStorage={permanentStorage}
      price={product.price}
      previousPrice={product.previousPrice}
      available={product.available}
      availableByOrder={product.availableByOrder === true}
      image={product.image}
      reviewSummary={product.reviewSummary}
      addToCartSlot={addToCartSlot}
      preorderSlot={preorderSlot}
      copy={toProductCardCopy(messages)}
      Image={StorefrontMediaImage}
      compareButton={
        variantId !== null ? (
          <ProductCompareButton
            product={{
              id: product.id,
              variantId,
              slug: product.slug,
              name: displayTitle,
              categorySlug: product.category.slug,
            }}
          />
        ) : undefined
      }
      favoriteButton={
        variantId !== null ? (
          <ProductFavoriteButton
            product={{
              id: product.id,
              variantId,
              slug: product.slug,
              name: displayTitle,
            }}
          />
        ) : undefined
      }
    />
  );
}
