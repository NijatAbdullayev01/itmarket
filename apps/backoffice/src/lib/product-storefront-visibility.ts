export type CatalogLifecycleStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type StorefrontVisibilityProduct = {
  status?: CatalogLifecycleStatus;
  category?: { status?: CatalogLifecycleStatus } | null;
  variants: { status?: CatalogLifecycleStatus; sku?: string }[];
};

export type CatalogVariantLifecycle = {
  status?: CatalogLifecycleStatus;
  sku?: string;
};

/** Backoffice lists hide archived SKU rows; archive also renames SKU to `archived-{id}`. */
export function isArchivedCatalogVariant(
  variant: CatalogVariantLifecycle,
): boolean {
  if (variant.status === "ARCHIVED") {
    return true;
  }

  const sku = variant.sku?.trim() ?? "";
  return sku.startsWith("archived-");
}

export function getManageableCatalogVariants<T extends CatalogVariantLifecycle>(
  variants: T[],
): T[] {
  return variants.filter((variant) => !isArchivedCatalogVariant(variant));
}

/** Mirrors storefront catalog listing (one card per active variant). */
export function isProductVisibleOnStorefront(
  product: StorefrontVisibilityProduct,
): boolean {
  if (product.status !== undefined && product.status !== "ACTIVE") {
    return false;
  }

  if (
    product.category?.status !== undefined &&
    product.category.status !== "ACTIVE"
  ) {
    return false;
  }

  return product.variants.some((variant) => variant.status === "ACTIVE");
}

export function getStorefrontVisibilityHint(
  product: StorefrontVisibilityProduct,
): string | null {
  if (isProductVisibleOnStorefront(product)) {
    return null;
  }

  if (product.status !== undefined && product.status !== "ACTIVE") {
    return "Mağazada görünmür — məhsul aktiv deyil.";
  }

  if (
    product.category?.status !== undefined &&
    product.category.status !== "ACTIVE"
  ) {
    return "Mağazada görünmür — kateqoriya aktiv deyil.";
  }

  if (
    !product.variants.some((variant) => variant.status === "ACTIVE")
  ) {
    return "Mağazada görünmür — ən azı bir aktiv SKU variant lazımdır.";
  }

  return "Mağazada görünmür.";
}
