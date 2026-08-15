import { getProductCatalogDisplayTitle } from "@itmarket/contracts";

export function getStorefrontProductDisplayTitle(
  product: {
    name: string;
    brand: { name: string; slug?: string } | null;
    requiredSpecs?: { label: string; value: string }[];
  },
  variant?: {
    name?: string;
    attributes?: Record<string, string>;
    sku?: string | null;
  } | null,
  options?: { includeVariantColor?: boolean },
) {
  return getProductCatalogDisplayTitle({
    brandName: product.brand?.name ?? null,
    brandSlug: product.brand?.slug ?? null,
    modelName: product.name,
    variantName: variant?.name ?? null,
    variantAttributes: variant?.attributes,
    includeVariantColor: options?.includeVariantColor,
    requiredSpecs: product.requiredSpecs,
    sku: variant?.sku ?? null,
  });
}

/** Kataloq kartı və metadata üçün default SKU variantının rəngi daxil edilir. */
export function getStorefrontProductDisplayTitleFromSummary(
  product: {
    name: string;
    brand: { name: string; slug?: string } | null;
    sku?: string | null;
    requiredSpecs?: { label: string; value: string }[];
    variantName?: string;
    variantAttributes?: Record<string, string>;
    /** Product detail: summary sahələri olmayanda ilk əlçatan/ilk variant istifadə olunur. */
    variants?: {
      name: string;
      attributes: Record<string, string>;
      available?: number;
      sku?: string | null;
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
      sku: product.sku,
    },
    options,
  );
}
