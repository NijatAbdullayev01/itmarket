import { getProductCatalogDisplayTitle } from "@itmarket/contracts";

export function getStorefrontProductDisplayTitle(
  product: {
    name: string;
    brand: { name: string } | null;
  },
  variant?: { name?: string; attributes?: Record<string, string> } | null,
  options?: { includeVariantColor?: boolean },
) {
  return getProductCatalogDisplayTitle({
    brandName: product.brand?.name ?? null,
    modelName: product.name,
    variantName: variant?.name ?? null,
    variantAttributes: variant?.attributes,
    includeVariantColor: options?.includeVariantColor,
  });
}

/** Kataloq kartı və metadata üçün default SKU variantının rəngi daxil edilir. */
export function getStorefrontProductDisplayTitleFromSummary(
  product: {
    name: string;
    brand: { name: string } | null;
    variantName?: string;
    variantAttributes?: Record<string, string>;
    /** Product detail: summary sahələri olmayanda ilk əlçatan/ilk variant istifadə olunur. */
    variants?: {
      name: string;
      attributes: Record<string, string>;
      available?: number;
    }[];
  },
  options?: { includeVariantColor?: boolean },
) {
  if (
    product.variantName === undefined &&
    product.variantAttributes === undefined &&
    product.variants !== undefined &&
    product.variants.length > 0
  ) {
    const firstAvailable = product.variants.find(
      (variant) => (variant.available ?? 0) > 0,
    );
    const fallbackVariant = firstAvailable ?? product.variants[0];
    return getStorefrontProductDisplayTitle(
      product,
      fallbackVariant,
      options,
    );
  }

  return getStorefrontProductDisplayTitle(
    product,
    {
      name: product.variantName,
      attributes: product.variantAttributes,
    },
    options,
  );
}
