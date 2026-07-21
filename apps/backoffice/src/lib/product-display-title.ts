import { getProductCatalogDisplayTitle } from "@itmarket/contracts";

export const BACKOFFICE_MISSING_BRAND_LABEL = "Brend yoxdur";

export function getBackofficeProductDisplayTitle(
  product: {
    name: string;
    brand: { id: string; name: string } | null;
  },
  variant?: { name: string; attributes?: unknown } | null,
) {
  return getProductCatalogDisplayTitle({
    brandName: product.brand?.name ?? null,
    modelName: product.name,
    variantName: variant?.name ?? null,
    variantAttributes: variant?.attributes,
    missingBrandLabel: BACKOFFICE_MISSING_BRAND_LABEL,
  });
}
