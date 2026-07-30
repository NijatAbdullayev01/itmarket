import type { CatalogSeoCoverageItemContract } from "@itmarket/contracts";

/** Backoffice edit deep-link for a coverage sample. */
export function coverageEditHref(item: CatalogSeoCoverageItemContract): string {
  if (item.entityType === "product") {
    return `/catalog/products?view=${encodeURIComponent(item.id)}`;
  }
  if (item.entityType === "brand") {
    return `/catalog/brands?edit=${encodeURIComponent(item.id)}`;
  }
  if (item.parentId) {
    return `/catalog/subcategories?edit=${encodeURIComponent(item.id)}`;
  }
  return `/catalog/categories?edit=${encodeURIComponent(item.id)}`;
}

export function coverageSampleKindLabel(
  item: CatalogSeoCoverageItemContract,
): string {
  if (item.entityType === "product") {
    return "Məhsul";
  }
  if (item.entityType === "brand") {
    return "Brend";
  }
  return item.parentId ? "Altkateqoriya" : "Kateqoriya";
}
