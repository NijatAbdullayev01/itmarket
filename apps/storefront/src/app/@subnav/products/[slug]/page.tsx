import { ProductBreadcrumb } from "@/components/product-breadcrumb";
import { ApiUnavailableError, listCategories } from "@/lib/api";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import {
  DEFAULT_LOCALE,
  getMessages,
  localizeCategoryName,
  withLocalizedCategoryNames,
} from "@/lib/i18n";
import { loadStorefrontProduct } from "@/lib/load-storefront-product";
import { getStorefrontProductDisplayTitleFromSummary } from "@/lib/product-display-title";
import { buildCategoryAncestorTrail } from "@/lib/seo";

export default async function ProductBreadcrumbSlot({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await loadStorefrontProduct(slug);
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const azMessages = getMessages(DEFAULT_LOCALE);
  const categoryNames = messages.catalog.categoryNames;
  const azCategoryNames = azMessages.catalog.categoryNames;

  let trail = [
    {
      name: localizeCategoryName(
        product.category.slug,
        product.category.name,
        categoryNames,
      ),
      path: `/categories/${product.category.slug}`,
    },
  ];
  let seoTrail = [
    {
      name: localizeCategoryName(
        product.category.slug,
        product.category.name,
        azCategoryNames,
      ),
      path: `/categories/${product.category.slug}`,
    },
  ];

  try {
    const categories = await listCategories();
    const localizedCategories = withLocalizedCategoryNames(
      categories,
      categoryNames,
    );
    const seoCategories = withLocalizedCategoryNames(
      categories,
      azCategoryNames,
    );
    const category = localizedCategories.find(
      (entry) => entry.slug === product.category.slug,
    );
    const seoCategory = seoCategories.find(
      (entry) => entry.slug === product.category.slug,
    );
    if (category) {
      const ancestors = buildCategoryAncestorTrail(category, localizedCategories);
      if (ancestors.length > 0) {
        trail = ancestors;
      }
    }
    if (seoCategory) {
      const ancestors = buildCategoryAncestorTrail(seoCategory, seoCategories);
      if (ancestors.length > 0) {
        seoTrail = ancestors;
      }
    }
  } catch (error) {
    if (!(error instanceof ApiUnavailableError)) {
      throw error;
    }
  }

  return (
    <ProductBreadcrumb
      trail={trail}
      seoTrail={seoTrail}
      productName={getStorefrontProductDisplayTitleFromSummary(product)}
      productSlug={product.slug}
    />
  );
}
