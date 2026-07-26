import {
  matchCatalogBrandByQuery,
  matchCatalogBrandBySlug,
} from "@itmarket/ui";
import { CatalogSearchBreadcrumb } from "@/components/catalog-search-breadcrumb";
import {
  ApiUnavailableError,
  listBrands,
  listCategories,
} from "@/lib/api";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { getMessages, localizeCategoryName } from "@/lib/i18n";

export default async function HomeSubnav({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    brand?: string;
  }>;
}) {
  const { q, category, brand } = await searchParams;
  const hasActiveFilters = Boolean(q || category || brand);

  if (!hasActiveFilters) {
    return null;
  }

  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  let categoryName: string | undefined;
  let brandName: string | undefined;

  if (category || brand || q) {
    try {
      const [categories, brands] = await Promise.all([
        category ? listCategories() : Promise.resolve([]),
        brand || q || category ? listBrands() : Promise.resolve([]),
      ]);
      const brandFromCategory = matchCatalogBrandBySlug(category, brands);
      if (category && !brandFromCategory) {
        const matched = categories.find((entry) => entry.slug === category);
        categoryName = matched
          ? localizeCategoryName(
              matched.slug,
              matched.name,
              messages.catalog.categoryNames,
            )
          : category;
      } else {
        categoryName = undefined;
      }
      const matchedBrand =
        (brand
          ? brands.find((entry) => entry.slug === brand)
          : undefined) ??
        brandFromCategory ??
        matchCatalogBrandByQuery(q, brands);
      brandName = matchedBrand?.name ?? brand;
    } catch (error) {
      if (!(error instanceof ApiUnavailableError)) {
        throw error;
      }
      categoryName = category;
      brandName = brand;
    }
  }

  const label = brandName ?? categoryName ?? messages.catalog.searchBreadcrumb;

  return (
    <CatalogSearchBreadcrumb label={label} />
  );
}
