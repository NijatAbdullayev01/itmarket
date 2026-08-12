import { supportsPhoneTabletVariantAttributes } from "@itmarket/contracts";

export type CategoryTreeEntry = {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
};

/** Admin kateqoriya ağacından Rəng/yaddaş variant dəstəyini hesabla. */
export function resolvePhoneTabletVariantSupport(
  categoryId: string | null | undefined,
  categories: CategoryTreeEntry[],
  fallback?: {
    slug?: string | null;
    name?: string | null;
    parentSlug?: string | null;
  },
) {
  if (categoryId !== undefined && categoryId !== null && categoryId !== "") {
    const leaf = categories.find((entry) => entry.id === categoryId);
    if (leaf !== undefined) {
      const parent =
        leaf.parentId !== undefined &&
        leaf.parentId !== null &&
        leaf.parentId !== ""
          ? categories.find((entry) => entry.id === leaf.parentId)
          : undefined;
      return supportsPhoneTabletVariantAttributes({
        slug: leaf.slug ?? "",
        name: leaf.name,
        parentSlug: parent?.slug ?? null,
        rootSlug: parent?.slug ?? leaf.slug ?? null,
      });
    }
  }

  return supportsPhoneTabletVariantAttributes({
    slug: fallback?.slug ?? "",
    name: fallback?.name ?? "",
    parentSlug: fallback?.parentSlug ?? null,
    rootSlug: fallback?.parentSlug ?? fallback?.slug ?? null,
  });
}
