import { addToCart } from "@/app/actions";
import { ProductCard } from "@itmarket/ui";
import type { ProductSummary } from "@/lib/api";

type CatalogProductCardProps = {
  product: ProductSummary;
  cartId?: string;
};

export function CatalogProductCard({ product, cartId }: CatalogProductCardProps) {
  const canQuickAdd =
    product.available > 0 && product.defaultVariantId !== null;

  const addToCartSlot = canQuickAdd ? (
    <form action={addToCart}>
      <input type="hidden" name="cartId" value={cartId ?? ""} />
      <input type="hidden" name="variantId" value={product.defaultVariantId!} />
      <input type="hidden" name="quantity" value="1" />
      <button type="submit" className="ui-btn ui-btn--cta ui-btn--block ui-product-card__cta">
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
      </button>
    </form>
  ) : undefined;

  return (
    <ProductCard
      slug={product.slug}
      name={product.name}
      price={product.price}
      previousPrice={product.previousPrice}
      available={product.available}
      image={product.image}
      addToCartSlot={addToCartSlot}
    />
  );
}
