import { getProductCatalogDisplayTitle } from "@itmarket/contracts";

export function getStorefrontProductDisplayTitle(
  product: {
    name: string;
    brand: { name: string } | null;
  },
  variant?: { name?: string; attributes?: Record<string, string> } | null,
) {
  return getProductCatalogDisplayTitle({
    brandName: product.brand?.name ?? null,
    modelName: product.name,
    variantName: variant?.name ?? null,
    variantAttributes: variant?.attributes,
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
