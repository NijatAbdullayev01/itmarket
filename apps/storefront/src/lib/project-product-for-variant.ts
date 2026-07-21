import type { ProductDetail } from "@/lib/api";

export function projectProductDetailForVariant(
  detail: ProductDetail,
  variantId: string,
): ProductDetail | null {
  const variant =
    detail.variants.find((entry) => entry.id === variantId) ?? detail.variants[0];
  if (!variant) {
    return null;
  }

  return {
    ...detail,
    price: variant.price,
    previousPrice: variant.previousPrice,
    available: variant.available,
    defaultVariantId: variant.id,
    variantName: variant.name,
    variantAttributes: variant.attributes,
    image: variant.image ?? detail.image,
    variants: [variant],
  };
}
