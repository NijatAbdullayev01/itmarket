import { CatalogLandingBreadcrumb } from "@/components/catalog-landing-breadcrumb";
import { ApiUnavailableError, listCategories } from "@/lib/api";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import {
  DEFAULT_LOCALE,
  getMessages,
  localizeCategoryName,
  withLocalizedCategoryNames,
} from "@/lib/i18n";
import { buildCategoryAncestorTrail } from "@/lib/seo";

export default async function CategoryBreadcrumbSlot({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const [locale, categories] = await Promise.all([
      getRequestLocale(),
      listCategories(),
    ]);
    const messages = getMessages(locale);
    const azMessages = getMessages(DEFAULT_LOCALE);
    const localizedCategories = withLocalizedCategoryNames(
      categories,
      messages.catalog.categoryNames,
    );
    const seoCategories = withLocalizedCategoryNames(
      categories,
      azMessages.catalog.categoryNames,
    );
    const category = localizedCategories.find((entry) => entry.slug === slug);
    const seoCategory = seoCategories.find((entry) => entry.slug === slug);
    if (category === undefined || seoCategory === undefined) {
      return null;
    }
    const trail = buildCategoryAncestorTrail(category, localizedCategories);
    const seoTrail = buildCategoryAncestorTrail(seoCategory, seoCategories);
    return (
      <CatalogLandingBreadcrumb
        trail={trail}
        seoTrail={seoTrail}
        currentName={localizeCategoryName(
          category.slug,
          category.name,
          messages.catalog.categoryNames,
        )}
      />
    );
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return null;
    }
    throw error;
  }
}
