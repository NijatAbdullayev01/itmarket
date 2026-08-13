import { getBackofficeProductDisplayTitle } from "./product-display-title";

function searchVariants(value: string): string[] {
  const localeNormalized = value.toLocaleLowerCase("az");
  const asciiNormalized = value.toLowerCase();
  return localeNormalized === asciiNormalized
    ? [localeNormalized]
    : [localeNormalized, asciiNormalized];
}

export type CatalogProductListSearchable = {
  kind: "variant" | "product-only";
  product: {
    name: string;
    slug?: string;
    brand: { id: string; name: string } | null;
  };
  variant?: {
    sku: string;
    barcode?: string | null;
    name?: string;
    attributes?: unknown;
  } | null;
};

function catalogProductListEntryHaystack(
  entry: CatalogProductListSearchable,
): string {
  const variant = entry.kind === "variant" ? (entry.variant ?? null) : null;
  const parts = [
    entry.product.name,
    entry.product.slug ?? "",
    entry.product.brand?.name ?? "",
    getBackofficeProductDisplayTitle(entry.product, variant),
  ];

  if (variant !== null) {
    parts.push(variant.sku, variant.barcode ?? "", variant.name ?? "");
  }

  return searchVariants(parts.filter(Boolean).join(" ")).join(" ");
}

export function filterCatalogProductListEntries<
  T extends CatalogProductListSearchable,
>(entries: readonly T[], query: string): T[] {
  const words = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => searchVariants(word));

  if (words.length === 0) {
    return [...entries];
  }

  return entries.filter((entry) => {
    const haystack = catalogProductListEntryHaystack(entry);
    return words.every((variants) =>
      variants.some((token) => haystack.includes(token)),
    );
  });
}
