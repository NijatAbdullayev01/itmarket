import { getProductCatalogDisplayTitle } from '@itmarket/contracts';

export function formatProductDisplayTitle(
  product: {
    name: string;
    brand?: { name: string } | null;
  },
  variant?: {
    name: string;
    attributes?: unknown;
  } | null,
) {
  return getProductCatalogDisplayTitle({
    brandName: product.brand?.name ?? null,
    modelName: product.name,
    variantName: variant?.name ?? null,
    variantAttributes: variant?.attributes,
  });
}
