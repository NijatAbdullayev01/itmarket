export type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
};

const SIDEBAR_EXCLUDED_SLUGS = new Set(["aksesuarlar"]);

export function getRootCategories(
  categories: CategoryItem[],
  limit = 12,
): CategoryItem[] {
  const roots = categories.filter(
    (category) => category.parentId == null && !SIDEBAR_EXCLUDED_SLUGS.has(category.slug),
  );
  const items =
    roots.length > 0
      ? roots
      : categories.filter((category) => !SIDEBAR_EXCLUDED_SLUGS.has(category.slug));

  return [...items]
    .sort((left, right) => left.name.localeCompare(right.name, "az"))
    .slice(0, limit);
}
