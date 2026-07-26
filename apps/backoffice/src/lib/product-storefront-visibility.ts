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

export type StorefrontVisibilityHint = {
  /** Short chip label for dense lists */
  label: string;
  /** Full sentence for tooltip / screen readers */
  detail: string;
};

export function getStorefrontVisibilityStatus(
  product: StorefrontVisibilityProduct,
): StorefrontVisibilityHint | null {
  if (isProductVisibleOnStorefront(product)) {
    return null;
  }

  if (product.status !== undefined && product.status !== "ACTIVE") {
    return {
      label: "Aktiv deyil",
      detail: "Mağazada görünmür — məhsul aktiv deyil.",
    };
  }

  if (
    product.category?.status !== undefined &&
    product.category.status !== "ACTIVE"
  ) {
    return {
      label: "Kateqoriya deaktiv",
      detail: "Mağazada görünmür — kateqoriya aktiv deyil.",
    };
  }

  if (!product.variants.some((variant) => variant.status === "ACTIVE")) {
    return {
      label: "Aktiv SKU yoxdur",
      detail: "Mağazada görünmür — ən azı bir aktiv SKU variant lazımdır.",
    };
  }

  return {
    label: "Görünmür",
    detail: "Mağazada görünmür.",
  };
}

export function getStorefrontVisibilityHint(
  product: StorefrontVisibilityProduct,
): string | null {
  return getStorefrontVisibilityStatus(product)?.detail ?? null;
}
