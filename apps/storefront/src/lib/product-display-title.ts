import {
  buildProductCatalogDisplayTitle,
  findColorAttribute,
  normalizeVariantAttributes,
} from "@itmarket/ui";

export function getStorefrontProductDisplayTitle(
  product: {
    name: string;
    brand: { name: string } | null;
  },
  variant?: { name?: string; attributes?: Record<string, string> } | null,
) {
  const colorName =
    variant === null || variant === undefined
      ? null
      : findColorAttribute(
          normalizeVariantAttributes(
            variant.attributes ?? {},
            variant.name,
          ),
        );

  return buildProductCatalogDisplayTitle({
    brandName: product.brand?.name ?? null,
    modelName: product.name,
    colorName,
  });
}

/** Kataloq kartı və metadata üçün default SKU variantının rəngi daxil edilir. */
export function getStorefrontProductDisplayTitleFromSummary(product: {
  name: string;
  brand: { name: string } | null;
  variantName?: string;
  variantAttributes?: Record<string, string>;
}) {
  return getStorefrontProductDisplayTitle(product, {
    name: product.variantName,
    attributes: product.variantAttributes,
  });
}
