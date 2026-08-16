import {
  getProductCatalogDisplayTitle,
  type ProductCatalogDisplayTitleCategory,
} from '@itmarket/contracts';

import { parseProductRequiredSpecs } from './product-required-specs';

export function formatProductDisplayTitle(
  product: {
    name: string;
    brand?: { name: string; slug?: string } | null;
    category?: ProductCatalogDisplayTitleCategory | null;
    requiredSpecs?: unknown;
  },
  variant?: {
    name: string;
    attributes?: unknown;
    sku?: string | null;
  } | null,
) {
  return getProductCatalogDisplayTitle({
    brandName: product.brand?.name ?? null,
    brandSlug: product.brand?.slug ?? null,
    modelName: product.name,
    variantName: variant?.name ?? null,
    variantAttributes: variant?.attributes,
    category: product.category ?? null,
    requiredSpecs: parseProductRequiredSpecs(product.requiredSpecs),
    sku: variant?.sku ?? null,
  });
}
