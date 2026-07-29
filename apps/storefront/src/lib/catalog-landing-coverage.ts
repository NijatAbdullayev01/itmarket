import type { CategorySummary, ProductSummary } from "./api";

/** Must match category/brand landing `limit` for `?page=` discovery. */
export const CATALOG_LANDING_PAGE_SIZE = 24;

export type LandingCoverage = {
  hasProducts: boolean;
  totalPages: number;
};

export function landingCoverageFromCount(count: number): LandingCoverage {
  if (!Number.isFinite(count) || count <= 0) {
    return { hasProducts: false, totalPages: 0 };
  }
  return {
    hasProducts: true,
    totalPages: Math.max(1, Math.ceil(count / CATALOG_LANDING_PAGE_SIZE)),
  };
}

/** Build "Parent > Child" product_type from category tree. */
export function buildCategoryProductTypePath(
  categorySlug: string,
  categories: CategorySummary[],
): string {
  const byId = new Map(categories.map((entry) => [entry.id, entry]));
  const bySlug = new Map(categories.map((entry) => [entry.slug, entry]));
  const parts: string[] = [];
  let node = bySlug.get(categorySlug);
  const seen = new Set<string>();
  while (node && !seen.has(node.id)) {
    seen.add(node.id);
    parts.unshift(node.name.trim());
    node = node.parentId ? byId.get(node.parentId) : undefined;
  }
  return parts.filter(Boolean).join(" > ");
}

function bumpCount(map: Map<string, number>, slug: string) {
  map.set(slug, (map.get(slug) ?? 0) + 1);
}

/**
 * Aggregate variant-row counts per category/brand slug from a catalog walk.
 * Landing pagination uses variant totals (API `productVariant.count`).
 *
 * Root category landings include child products (`categoryWhereForSlug`), so
 * counts roll up through `parentId` when a category tree is provided — otherwise
 * parent landings would be missing from the sitemap despite being indexable.
 */
export function buildLandingCoverageMaps(
  items: ProductSummary[],
  categories: CategorySummary[] = [],
): {
  categoryCounts: Map<string, number>;
  brandCounts: Map<string, number>;
} {
  const categoryById = new Map(categories.map((entry) => [entry.id, entry]));
  const categoryCounts = new Map<string, number>();
  const brandCounts = new Map<string, number>();

  for (const item of items) {
    const categorySlug = item.category?.slug?.trim();
    if (categorySlug) {
      bumpCount(categoryCounts, categorySlug);

      let parentId = item.category?.parentId ?? null;
      const seen = new Set<string>();
      while (parentId && !seen.has(parentId)) {
        seen.add(parentId);
        const parent = categoryById.get(parentId);
        if (!parent) {
          break;
        }
        const parentSlug = parent.slug.trim();
        if (parentSlug) {
          bumpCount(categoryCounts, parentSlug);
        }
        parentId = parent.parentId;
      }
    }

    const brandSlug = item.brand?.slug?.trim();
    if (brandSlug) {
      bumpCount(brandCounts, brandSlug);
    }
  }

  return { categoryCounts, brandCounts };
}
