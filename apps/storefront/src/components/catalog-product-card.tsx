import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductCompareButton } from "@/components/product-compare-button";
import { ProductFavoriteButton } from "@/components/product-favorite-button";
import { IconCart, ProductCard, getVariantPermanentStorageLabel } from "@itmarket/ui";
import type { ProductSummary } from "@/lib/api";
import { getStorefrontProductDisplayTitleFromSummary } from "@/lib/product-display-title";

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
      Səbətə at
    </AddToCartButton>
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
      image={product.image}
      reviewSummary={product.reviewSummary}
      addToCartSlot={addToCartSlot}
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
