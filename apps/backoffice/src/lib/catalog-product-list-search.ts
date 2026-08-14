import {
  catalogSearchMatches,
  catalogSearchableTextFromJson,
} from "@itmarket/contracts";

import { getBackofficeProductDisplayTitle } from "./product-display-title";

export type CatalogProductListSearchable = {
  kind: "variant" | "product-only";
  product: {
    name: string;
    slug?: string;
    description?: string | null;
    requiredSpecs?: unknown;
    brand: { id: string; name: string } | null;
    category?: { name?: string | null } | null;
  };
  variant?: {
    sku: string;
    barcode?: string | null;
    name?: string;
    attributes?: unknown;
  } | null;
};

export function filterCatalogProductListEntries<
  T extends CatalogProductListSearchable,
>(entries: readonly T[], query: string): T[] {
  const trimmed = query.trim();
  if (trimmed === "") {
    return [...entries];
  }

  return entries.filter((entry) => {
    const variant = entry.kind === "variant" ? (entry.variant ?? null) : null;
    const variantForTitle =
      variant === null
        ? null
        : { name: variant.name ?? "", attributes: variant.attributes };
    return catalogSearchMatches(trimmed, {
      sku: variant?.sku ?? "",
      barcode: variant?.barcode ?? null,
      variantName: variant?.name ?? "",
      productName: entry.product.name,
      brandName: entry.product.brand?.name ?? null,
      categoryName: entry.product.category?.name ?? null,
      colorName: null,
      slug: entry.product.slug ?? null,
      description: entry.product.description ?? null,
      extraText: [
        getBackofficeProductDisplayTitle(entry.product, variantForTitle),
        catalogSearchableTextFromJson(entry.product.requiredSpecs),
        catalogSearchableTextFromJson(variant?.attributes),
      ].join(" "),
    });
  });
}
