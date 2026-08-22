import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  CatalogFilters,
  CatalogIntro,
  CatalogPagination,
  CatalogResultsBanner,
  CatalogSearchHeader,
  EmptyState,
  EmptyStateLink,
  IconAlertCircle,
  buildCatalogHref,
  catalogQueryMatchesBrand,
  matchCatalogBrandByQuery,
  matchCatalogBrandBySlug,
} from "@itmarket/ui";
import { CatalogProductCard } from "@/components/catalog-product-card";
import { StorefrontMediaImage } from "@/components/storefront-media-image";
import {
  ApiUnavailableError,
  listBanners,
  listBrands,
  listCategories,
  listProducts,
  type BannerSummary,
  type BrandSummary,
  type CatalogFilter,
  type CatalogProductList,
  type CategorySummary,
} from "@/lib/api";
import { PaginationSeoLinks } from "@/components/pagination-seo-links";
import { BlogGuideLinks } from "@/components/blog-guide-links";
import { redirectIfCatalogSlugMoved } from "@/lib/catalog-slug-redirect";
import {
  buildCategoryMetadata,
  buildCollectionPageJsonLd,
  buildPaginationLinkHrefs,
  hasCategoryPageSeoFilters,
  isCatalogPageOutOfRange,
  noIndexRobots,
  parseCatalogPage,
  toJsonLd,
  type CatalogSeoSearchParams,
} from "@/lib/seo";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import {
  DEFAULT_LOCALE,
  getMessages,
  localizeCategoryName,
  toCatalogFiltersCopy,
  toCatalogIntroCopy,
  toCatalogPaginationCopy,
  toCatalogResultsBannerCopy,
  toCatalogSearchHeaderCopy,
  withLocalizedCategoryNames,
} from "@/lib/i18n";
import { getBlogGuidesForCategory, getBlogPageContent } from "@/lib/i18n/blog/blog";

const productEmptyIcon = <IconAlertCircle width={40} height={40} />;

export const revalidate = 120;

type CategoryPageSearchParams = Omit<CatalogSeoSearchParams, "category">;

function parseOptionalNumber(value: string | undefined) {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalFlag(value: string | undefined) {
  return value === "1" || value === "true" ? true : undefined;
}

function toHeroSlides(banners: BannerSummary[]) {
  return banners.map((banner) => ({
    id: banner.id,
    href: banner.href,
    bannerSrc: banner.imageObjectKey,
    bannerAlt: banner.altText,
  }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<CategoryPageSearchParams>;
}): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const page = parseCatalogPage(query.page);
  let category: CategorySummary | undefined;

  try {
    const categories = await listCategories();
    category = categories.find((entry) => entry.slug === slug);
  } catch {
    // Fall through with slug-based fallback metadata.
  }

  if (category === undefined) {
    await redirectIfCatalogSlugMoved("category", slug);
    const m = getMessages(DEFAULT_LOCALE);
    return {
      title: m.catalog.categoryNotFound,
      robots: noIndexRobots,
    };
  }

  const azMessages = getMessages(DEFAULT_LOCALE);
  const seoName = localizeCategoryName(
    category.slug,
    category.name,
    azMessages.catalog.categoryNames,
  );

  const filtered = hasCategoryPageSeoFilters(query);
  let empty = false;
  let pageOutOfRange = false;

  if (!filtered) {
    try {
      const products = await listProducts({
        category: slug,
        limit: 1,
        page: 1,
      });
      empty = products.totalCount === 0 || products.items.length === 0;
      pageOutOfRange = isCatalogPageOutOfRange(page, products.totalPages);
    } catch {
      // On API error, assume not empty / in-range to avoid false noindex.
    }
  }

  return buildCategoryMetadata({
    slug: category.slug,
    name: seoName,
    seoTitle: category.seoTitle,
    seoDescription: category.seoDescription,
    filtered,
    empty,
    pageOutOfRange,
    page,
  });
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    q?: string;
    brand?: string;
    sort?: "newest" | "name" | "price";
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
    onSale?: string;
    color?: string;
    ram?: string;
    storage?: string;
    page?: string;
  }>;
}) {
  const [
    { slug },
    {
      q,
      brand,
      sort,
      minPrice: minPriceParam,
      maxPrice: maxPriceParam,
      inStock: inStockParam,
      onSale: onSaleParam,
      color,
      ram,
      storage,
      page: pageParam,
    },
  ] = await Promise.all([params, searchParams]);

  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const minPrice = parseOptionalNumber(minPriceParam);
  const maxPrice = parseOptionalNumber(maxPriceParam);
  const inStock = parseOptionalFlag(inStockParam);
  const onSale = parseOptionalFlag(onSaleParam);
  const page = parseCatalogPage(pageParam);

  let categories: CategorySummary[] = [];
  let brands: BrandSummary[] = [];
  let banners: BannerSummary[] = [];
  let products: CatalogProductList = {
    items: [],
    nextCursor: null,
    page: 1,
    pageSize: 24,
    totalCount: 0,
    totalPages: 1,
  };
  let apiUnavailable = false;

  // Common browse path (no search) — overlap product list with taxonomy fetches.
  const earlyProductsPromise =
    !q
      ? listProducts({
          category: slug,
          brand,
          sort,
          minPrice,
          maxPrice,
          inStock,
          onSale,
          color,
          ram,
          storage,
          page,
          limit: 24,
        }).catch((error: unknown) => {
          if (error instanceof ApiUnavailableError) {
            return null;
          }
          throw error;
        })
      : null;

  try {
    [categories, brands, banners] = await Promise.all([
      listCategories(),
      listBrands(),
      listBanners(),
    ]);
  } catch (error) {
    if (!(error instanceof ApiUnavailableError)) {
      throw error;
    }
    apiUnavailable = true;
  }

  const brandMatchedByCategory = matchCatalogBrandBySlug(slug, brands);
  if (brandMatchedByCategory) {
    permanentRedirect(
      buildCatalogHref({
        q,
        brand: brandMatchedByCategory.slug,
        sort,
        minPrice,
        maxPrice,
        inStock,
        onSale,
        color,
        ram,
        storage,
        page: page > 1 ? page : undefined,
      }),
    );
  }

  const category = categories.find((entry) => entry.slug === slug);
  if (!apiUnavailable && category === undefined) {
    await redirectIfCatalogSlugMoved("category", slug);
    notFound();
  }

  const matchedBrandFromQuery = matchCatalogBrandByQuery(q, brands);
  const effectiveBrand = brand ?? matchedBrandFromQuery?.slug;
  const qMatchesActiveBrand = catalogQueryMatchesBrand(
    q,
    effectiveBrand,
    brands,
  );
  const filters: CatalogFilter = {
    search: qMatchesActiveBrand ? undefined : q,
    category: slug,
    brand: effectiveBrand,
    sort,
    minPrice,
    maxPrice,
    inStock,
    onSale,
    color,
    ram,
    storage,
    page,
    limit: 24,
  };

  if (!apiUnavailable) {
    const earlyMatchesFinal =
      earlyProductsPromise !== null &&
      effectiveBrand === brand &&
      !qMatchesActiveBrand;
    if (earlyMatchesFinal) {
      const resolved = await earlyProductsPromise;
      if (resolved === null) {
        apiUnavailable = true;
      } else {
        products = resolved;
      }
    } else {
      try {
        products = await listProducts(filters);
      } catch (error) {
        if (!(error instanceof ApiUnavailableError)) {
          throw error;
        }
        apiUnavailable = true;
      }
    }
  }

  const searchBannerSlides = toHeroSlides(
    banners.filter((banner) => banner.placement === "CATALOG_SEARCH"),
  );
  const showSearchBanner = !apiUnavailable && searchBannerSlides.length > 0;
  const azMessages = getMessages(DEFAULT_LOCALE);
  const localizedCategories = withLocalizedCategoryNames(
    categories,
    messages.catalog.categoryNames,
  );
  const categoryName = category
    ? localizeCategoryName(
        category.slug,
        category.name,
        messages.catalog.categoryNames,
      )
    : slug;
  const seoCategoryName = category
    ? localizeCategoryName(
        category.slug,
        category.name,
        azMessages.catalog.categoryNames,
      )
    : slug;
  const brandName = effectiveBrand
    ? (brands.find((entry) => entry.slug === effectiveBrand)?.name ??
      effectiveBrand)
    : undefined;
  const displayQ = qMatchesActiveBrand ? undefined : q;
  const totalPages = products.totalPages ?? 1;
  const resultCount = products.totalCount ?? products.items.length;
  const hrefBase = {
    q: displayQ,
    category: slug,
    brand: effectiveBrand,
    sort,
    minPrice,
    maxPrice,
    inStock,
    onSale,
    color,
    ram,
    storage,
  };
  const basePath = `/categories/${slug}`;
  const isIndexableListing = !hasCategoryPageSeoFilters({
    q,
    brand,
    sort,
    minPrice: minPriceParam,
    maxPrice: maxPriceParam,
    inStock: inStockParam,
    onSale: onSaleParam,
    color,
    ram,
    storage,
  });
  const intro =
    category?.description?.trim() ||
    (isIndexableListing && page === 1 && category?.seoDescription?.trim()
      ? category.seoDescription.trim()
      : undefined);
  const childCategories = category
    ? localizedCategories.filter((entry) => entry.parentId === category.id)
    : [];
  const hasActiveFilters = Boolean(
    displayQ ||
    effectiveBrand ||
    minPrice !== undefined ||
    maxPrice !== undefined ||
    inStock ||
    onSale ||
    color ||
    ram ||
    storage,
  );
  if (
    !apiUnavailable &&
    isIndexableListing &&
    isCatalogPageOutOfRange(page, products.totalPages)
  ) {
    notFound();
  }
  const paginationLinks =
    !apiUnavailable && isIndexableListing
      ? buildPaginationLinkHrefs({
          page,
          totalPages,
          buildPageHref: (nextPage) =>
            nextPage > 1 ? `${basePath}?page=${nextPage}` : basePath,
        })
      : {};
  const parentSlug = category?.parentId
    ? categories.find((entry) => entry.id === category.parentId)?.slug
    : undefined;
  const blogGuides =
    page <= 1 && isIndexableListing
      ? getBlogGuidesForCategory(locale, [slug, parentSlug], 3)
      : [];
  const blogCopy = getBlogPageContent(locale);

  const searchHeader = !apiUnavailable ? (
    <CatalogSearchHeader
      q={displayQ}
      category={slug}
      categoryName={categoryName}
      brand={effectiveBrand}
      brandName={brandName}
      sort={sort}
      minPrice={minPrice}
      maxPrice={maxPrice}
      inStock={inStock}
      onSale={onSale}
      color={color}
      ram={ram}
      storage={storage}
      resultCount={resultCount}
      copy={toCatalogSearchHeaderCopy(messages)}
    />
  ) : null;

  const productGrid =
    products.items.length > 0 ? (
      <div className="ui-product-grid">
        {products.items.map((product) => (
          <CatalogProductCard
            key={product.defaultVariantId ?? product.id}
            product={product}
          />
        ))}
      </div>
    ) : null;

  return (
    <div className="ui-container">
      <PaginationSeoLinks prev={paginationLinks.prev} next={paginationLinks.next} />
      {apiUnavailable ? (
        <EmptyState
          title={messages.catalog.apiUnavailableTitle}
          description={messages.catalog.apiUnavailableDescription}
          action={<EmptyStateLink href="/" label={messages.common.retry} />}
        />
      ) : (
        <>
          {showSearchBanner ? (
            <CatalogResultsBanner slides={searchBannerSlides} copy={toCatalogResultsBannerCopy(messages)} Image={StorefrontMediaImage} />
          ) : null}
          <CatalogFilters
            q={displayQ}
            category={slug}
            brand={effectiveBrand}
            sort={sort}
            minPrice={minPrice}
            maxPrice={maxPrice}
            inStock={inStock}
            onSale={onSale}
            color={color}
            ram={ram}
            storage={storage}
            categories={localizedCategories}
            brands={brands}
            copy={toCatalogFiltersCopy(messages, locale)}
          >
            {searchHeader}
            {intro ? (
              <CatalogIntro text={intro} copy={toCatalogIntroCopy(messages)} />
            ) : null}
            {childCategories.length > 0 && page === 1 && !hasActiveFilters ? (
              <nav
                className="ui-catalog-subcategories"
                aria-label={categoryName}
              >
                <ul className="ui-catalog-subcategories__list">
                  {childCategories.map((child) => (
                    <li key={child.slug}>
                      <Link
                        className="ui-catalog-subcategories__link"
                        href={`/categories/${encodeURIComponent(child.slug)}`}
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
            {productGrid ?? (
              <EmptyState
                title={messages.catalog.emptyTitle}
                description={messages.catalog.emptyDescription}
                icon={productEmptyIcon}
                iconTone="error"
                action={
                  <EmptyStateLink
                    href={`/categories/${encodeURIComponent(slug)}`}
                    label={messages.catalog.backToCategory}
                  />
                }
              />
            )}
            <CatalogPagination
              page={page}
              totalPages={totalPages}
              buildHref={(nextPage) =>
                buildCatalogHref({
                  ...hrefBase,
                  page: nextPage > 1 ? nextPage : undefined,
                })
              }
              copy={toCatalogPaginationCopy(messages)}
            />
          </CatalogFilters>
          <BlogGuideLinks
            title={blogCopy.guidesTitle}
            posts={blogGuides}
            readMoreLabel={blogCopy.readMore}
            readingTimeLabel={blogCopy.readingTimeLabel}
            allGuidesLabel={blogCopy.allGuides}
          />
          {isIndexableListing ? (
            <script
              type="application/ld+json"
              suppressHydrationWarning
              dangerouslySetInnerHTML={{
                __html: toJsonLd(
                  buildCollectionPageJsonLd({
                    name: seoCategoryName,
                    description: category?.seoDescription ?? intro,
                    path:
                      page > 1
                        ? `/categories/${slug}?page=${page}`
                        : `/categories/${slug}`,
                    products: products.items,
                  }),
                ),
              }}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
