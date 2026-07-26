import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CatalogFilters,
  CatalogPagination,
  CatalogResultsBanner,
  CatalogSearchHeader,
  EmptyState,
  EmptyStateLink,
  IconAlertCircle,
  buildCatalogHref,
  catalogQueryMatchesBrand,
  matchCatalogBrandByQuery,
} from "@itmarket/ui";
import { CatalogProductCard } from "@/components/catalog-product-card";
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
import {
  buildBrandMetadata,
  buildCollectionPageJsonLd,
  buildPaginationLinkHrefs,
  hasBrandPageSeoFilters,
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
  toCatalogPaginationCopy,
  toCatalogSearchHeaderCopy,
  withLocalizedCategoryNames,
} from "@/lib/i18n";

const productEmptyIcon = <IconAlertCircle width={40} height={40} />;

export const revalidate = 120;

type BrandPageSearchParams = Omit<CatalogSeoSearchParams, "brand">;

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
  searchParams: Promise<BrandPageSearchParams>;
}): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const page = parseCatalogPage(query.page);
  let brand: BrandSummary | undefined;

  try {
    const brands = await listBrands();
    brand = brands.find((entry) => entry.slug === slug);
  } catch {
    // Fall through with slug-based fallback metadata.
  }

  if (brand === undefined) {
    const m = getMessages(DEFAULT_LOCALE);
    return {
      title: m.catalog.brandNotFound,
      robots: noIndexRobots,
    };
  }

  return buildBrandMetadata({
    slug: brand.slug,
    name: brand.name,
    seoTitle: brand.seoTitle,
    seoDescription: brand.seoDescription,
    filtered: hasBrandPageSeoFilters(query),
    page,
  });
}

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    q?: string;
    category?: string;
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
      category,
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

  const brand = brands.find((entry) => entry.slug === slug);
  if (!apiUnavailable && brand === undefined) {
    notFound();
  }

  const matchedBrandFromQuery = matchCatalogBrandByQuery(q, brands);
  const qMatchesActiveBrand = catalogQueryMatchesBrand(q, slug, brands);
  const filters: CatalogFilter = {
    search: qMatchesActiveBrand ? undefined : q,
    category,
    brand: slug,
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
    try {
      products = await listProducts(filters);
    } catch (error) {
      if (!(error instanceof ApiUnavailableError)) {
        throw error;
      }
      apiUnavailable = true;
    }
  }

  const searchBannerSlides = toHeroSlides(
    banners.filter((banner) => banner.placement === "CATALOG_SEARCH"),
  );
  const showSearchBanner = !apiUnavailable && searchBannerSlides.length > 0;
  const brandName = brand?.name ?? matchedBrandFromQuery?.name ?? slug;
  const localizedCategories = withLocalizedCategoryNames(
    categories,
    messages.catalog.categoryNames,
  );
  const matchedCategory = category
    ? categories.find((entry) => entry.slug === category)
    : undefined;
  const categoryName = matchedCategory
    ? localizeCategoryName(
        matchedCategory.slug,
        matchedCategory.name,
        messages.catalog.categoryNames,
      )
    : category;
  const displayQ = qMatchesActiveBrand ? undefined : q;
  const totalPages = products.totalPages ?? 1;
  const resultCount = products.totalCount ?? products.items.length;
  const intro = brand?.description?.trim();
  const basePath = `/brands/${slug}`;
  const isIndexableListing = !hasBrandPageSeoFilters({
    q,
    category,
    sort,
    minPrice: minPriceParam,
    maxPrice: maxPriceParam,
    inStock: inStockParam,
    onSale: onSaleParam,
    color,
    ram,
    storage,
  });
  const paginationLinks =
    !apiUnavailable && isIndexableListing
      ? buildPaginationLinkHrefs({
          page,
          totalPages,
          buildPageHref: (nextPage) =>
            nextPage > 1 ? `${basePath}?page=${nextPage}` : basePath,
        })
      : {};
  const hrefBase = {
    q: displayQ,
    category,
    brand: slug,
    sort,
    minPrice,
    maxPrice,
    inStock,
    onSale,
    color,
    ram,
    storage,
  };

  const searchHeader = !apiUnavailable ? (
    <CatalogSearchHeader
      q={displayQ}
      category={category}
      categoryName={categoryName}
      brand={slug}
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
            <CatalogResultsBanner slides={searchBannerSlides} />
          ) : null}
          <CatalogFilters
            q={displayQ}
            category={category}
            brand={slug}
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
            copy={toCatalogFiltersCopy(messages)}
          >
            {searchHeader}
            {intro ? <p className="ui-catalog-intro">{intro}</p> : null}
            {productGrid ?? (
              <EmptyState
                title={messages.catalog.emptyTitle}
                description={messages.catalog.emptyDescription}
                icon={productEmptyIcon}
                iconTone="error"
                action={
                  <EmptyStateLink
                    href={`/brands/${encodeURIComponent(slug)}`}
                    label={messages.catalog.backToBrand}
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
          {isIndexableListing ? (
            <script
              type="application/ld+json"
              suppressHydrationWarning
              dangerouslySetInnerHTML={{
                __html: toJsonLd(
                  buildCollectionPageJsonLd({
                    name: brandName,
                    description: brand?.seoDescription ?? intro,
                    path:
                      page > 1
                        ? `/brands/${slug}?page=${page}`
                        : `/brands/${slug}`,
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
