import {
  buildProductCatalogDisplayTitle,
  findColorAttribute,
  normalizeVariantAttributes,
} from "@itmarket/ui";

import { parseVariantAttributes } from "./product-existing-catalog";

export const BACKOFFICE_MISSING_BRAND_LABEL = "Brend yoxdur";

export function getBackofficeProductDisplayTitle(
  product: {
    name: string;
    brand: { id: string; name: string } | null;
  },
  variant?: { name: string; attributes?: unknown } | null,
) {
  const colorName =
    variant === null || variant === undefined
      ? null
      : findColorAttribute(
          normalizeVariantAttributes(
            parseVariantAttributes(variant.attributes),
            variant.name,
          ),
        );

  return buildProductCatalogDisplayTitle({
    brandName: product.brand?.name ?? null,
    modelName: product.name,
    colorName,
    missingBrandLabel: BACKOFFICE_MISSING_BRAND_LABEL,
  });
}
