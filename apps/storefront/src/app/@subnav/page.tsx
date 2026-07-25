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

function resolveBreadcrumbLabel({
  q,
  categoryName,
  brandName,
}: {
  q?: string;
  categoryName?: string;
  brandName?: string;
}) {
  if (brandName) return brandName;
  if (categoryName) return categoryName;
  if (q?.trim()) return "Axtarış";
  return "Axtarış";
}

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

  let categoryName: string | undefined;
  let brandName: string | undefined;

  if (category || brand || q) {
    try {
      const [categories, brands] = await Promise.all([
        category ? listCategories() : Promise.resolve([]),
        brand || q || category ? listBrands() : Promise.resolve([]),
      ]);
      const brandFromCategory = matchCatalogBrandBySlug(category, brands);
      categoryName =
        category && !brandFromCategory
          ? (categories.find((entry) => entry.slug === category)?.name ??
            category)
          : undefined;
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

  return (
    <CatalogSearchBreadcrumb
      label={resolveBreadcrumbLabel({ q, categoryName, brandName })}
    />
  );
}
