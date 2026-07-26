export function localizeCategoryName(
  slug: string | undefined | null,
  fallbackName: string,
  categoryNames: Record<string, string>,
): string {
  if (typeof slug !== "string" || slug.trim() === "") {
    return fallbackName;
  }

  const localized = categoryNames[slug]?.trim();
  return localized && localized.length > 0 ? localized : fallbackName;
}

export function withLocalizedCategoryNames<
  T extends { slug?: string | null; name: string },
>(categories: T[], categoryNames: Record<string, string>): T[] {
  if (Object.keys(categoryNames).length === 0) {
    return categories;
  }

  return categories.map((category) => ({
    ...category,
    name: localizeCategoryName(category.slug, category.name, categoryNames),
  }));
}
