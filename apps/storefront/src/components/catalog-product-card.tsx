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
      <button type="submit" className="ui-btn ui-btn--cta ui-btn--block">
        Səbətə at
      </button>
    </form>
  ) : undefined;

  return (
    <ProductCard
      slug={product.slug}
      name={product.name}
      brandName={product.brand?.name}
      price={product.price}
      previousPrice={product.previousPrice}
      available={product.available}
      image={product.image}
      addToCartSlot={addToCartSlot}
    />
  );
}
