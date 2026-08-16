import {
  catalogSearchColorAttributeKeys,
  catalogSearchableTextFromJson,
  scoreCatalogSearchHit,
  type CatalogSearchableFields,
} from "@itmarket/contracts";

import { getBackofficeProductDisplayTitle } from "./product-display-title";

export type CatalogProductListSearchable = {
  kind: "variant" | "product-only";
  product: {
    name: string;
    slug?: string;
    description?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    requiredSpecs?: unknown;
    brand: { id: string; name: string } | null;
    category?: {
      name?: string | null;
      slug?: string | null;
      parentSlug?: string | null;
      parent?: { slug?: string | null; name?: string | null } | null;
    } | null;
  };
  variant?: {
    sku: string;
    barcode?: string | null;
    name?: string;
    attributes?: unknown;
  } | null;
};

function colorNameFromAttributes(attributes: unknown): string | null {
  if (attributes === null || attributes === undefined) {
    return null;
  }
  if (typeof attributes !== "object") {
    return null;
  }
  const record = attributes as Record<string, unknown>;
  for (const key of catalogSearchColorAttributeKeys()) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return null;
}

export function catalogProductListSearchFields(
  entry: CatalogProductListSearchable,
): CatalogSearchableFields {
  const variant = entry.kind === "variant" ? (entry.variant ?? null) : null;
  const variantForTitle =
    variant === null
      ? null
      : { name: variant.name ?? "", attributes: variant.attributes };
  const parentCategoryName =
    entry.product.category?.parent?.name?.trim() || null;

  return {
    sku: variant?.sku ?? "",
    barcode: variant?.barcode ?? null,
    variantName: variant?.name ?? "",
    productName: entry.product.name,
    brandName: entry.product.brand?.name ?? null,
    categoryName: entry.product.category?.name ?? null,
    parentCategoryName,
    colorName: colorNameFromAttributes(variant?.attributes),
    slug: entry.product.slug ?? null,
    description: entry.product.description ?? null,
    extraText: [
      getBackofficeProductDisplayTitle(entry.product, variantForTitle),
      entry.product.seoTitle ?? "",
      entry.product.seoDescription ?? "",
      entry.product.category?.slug ?? "",
      entry.product.category?.parentSlug ?? "",
      entry.product.category?.parent?.slug ?? "",
      catalogSearchableTextFromJson(entry.product.requiredSpecs),
      catalogSearchableTextFromJson(variant?.attributes),
    ]
      .filter((part) => part.trim() !== "")
      .join(" "),
  };
}

export function filterCatalogProductListEntries<
  T extends CatalogProductListSearchable,
>(entries: readonly T[], query: string): T[] {
  const trimmed = query.trim();
  if (trimmed === "") {
    return [...entries];
  }

  const ranked = entries
    .map((entry, index) => ({
      entry,
      index,
      score: scoreCatalogSearchHit(
        trimmed,
        catalogProductListSearchFields(entry),
        { lenient: true },
      ),
    }))
    .filter((row) => row.score > 0);

  ranked.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return left.index - right.index;
  });

  return ranked.map((row) => row.entry);
}
