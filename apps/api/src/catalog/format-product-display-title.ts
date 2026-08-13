import {
  getProductCatalogDisplayTitle,
  type ProductCatalogDisplayTitleCategory,
} from '@itmarket/contracts';

export function formatProductDisplayTitle(
  product: {
    name: string;
    brand?: { name: string } | null;
    category?: ProductCatalogDisplayTitleCategory | null;
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
    category: product.category,
  });
}
