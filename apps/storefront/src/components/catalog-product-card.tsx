import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductCompareButton } from "@/components/product-compare-button";
import { ProductFavoriteButton } from "@/components/product-favorite-button";
import { ProductCard, getVariantPermanentStorageLabel } from "@itmarket/ui";
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
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        width={18}
        height={18}
        aria-hidden="true"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
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
