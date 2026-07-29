import { permanentRedirect } from "next/navigation";
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
  matchCatalogBrandByQuery,
  matchCatalogBrandBySlug,
} from "@itmarket/ui";
import { CatalogProductCard } from "@/components/catalog-product-card";
import { LocalizedCatalogHero } from "@/components/localized-catalog-hero";
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
import {
  buildCollectionPageJsonLd,
  buildHomeMetadata,
  noIndexRobots,
  parseCatalogPage,
  toJsonLd,
  type CatalogSeoSearchParams,
} from "@/lib/seo";

const productEmptyIcon = <IconAlertCircle width={40} height={40} />;

export const revalidate = 120;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<CatalogSeoSearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  let brandName: string | undefined;
  let categoryName: string | undefined;
  const azMessages = getMessages(DEFAULT_LOCALE);

  try {
    if (params.brand || params.category) {
      const [brands, categories] = await Promise.all([
        listBrands(),
        listCategories(),
      ]);
      brandName = params.brand
        ? brands.find((entry) => entry.slug === params.brand)?.name
        : undefined;
      if (params.category) {
        const matched = categories.find(
          (entry) => entry.slug === params.category,
        );
        if (matched) {
          categoryName = localizeCategoryName(
            matched.slug,
            matched.name,
            azMessages.catalog.categoryNames,
          );
        }
      }
    }
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return {
        ...buildHomeMetadata(params),
        robots: noIndexRobots,
      };
    }
  }

  return buildHomeMetadata(params, { brandName, categoryName });
}

function toHeroSlides(banners: BannerSummary[]) {
  return banners.map((banner) => ({
    id: banner.id,
    href: banner.href,
    bannerSrc: banner.imageObjectKey,
    bannerAlt: banner.altText,
  }));
}

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

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
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
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const {
    q,
    category,
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
  } = await searchParams;
  const minPrice = parseOptionalNumber(minPriceParam);
  const maxPrice = parseOptionalNumber(maxPriceParam);
  const inStock = parseOptionalFlag(inStockParam);
  const onSale = parseOptionalFlag(onSaleParam);
  const page = parseCatalogPage(pageParam);
  const hasActiveFilters = Boolean(
    q ||
      category ||
      brand ||
      minPrice !== undefined ||
      maxPrice !== undefined ||
      inStock ||
      onSale ||
      color ||
      ram ||
      storage,
  );

  const filters: CatalogFilter = {
    search: q,
    sort,
    minPrice,
    maxPrice,
    inStock,
    onSale,
    color,
    ram,
    storage,
    page: hasActiveFilters ? page : 1,
    limit: 24,
  };

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

  // Home/search (no category/brand redirect) — start products with meta fetches.
  const productsPromise =
    !category && !brand
      ? listProducts(filters).catch((error: unknown) => {
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

  const brandMatchedByCategory =
    !brand && category ? matchCatalogBrandBySlug(category, brands) : undefined;
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

  if (brand) {
    permanentRedirect(
      buildCatalogHref({
        q,
        brand,
        category,
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

  if (category) {
    permanentRedirect(
      buildCatalogHref({
        q,
        category,
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

  const matchedBrandFromQuery = matchCatalogBrandByQuery(q, brands);
  if (matchedBrandFromQuery) {
    permanentRedirect(
      buildCatalogHref({
        brand: matchedBrandFromQuery.slug,
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

  if (!apiUnavailable) {
    if (productsPromise) {
      const resolved = await productsPromise;
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

  const homeHeroSlides = toHeroSlides(
    banners.filter(
      (banner) =>
        banner.placement === "HOME_HERO" || banner.placement === undefined,
    ),
  );
  const searchBannerSlides = toHeroSlides(
    banners.filter((banner) => banner.placement === "CATALOG_SEARCH"),
  );
  const showSearchBanner =
    hasActiveFilters && !apiUnavailable && searchBannerSlides.length > 0;
  const displayQ = q;
  const totalPages = products.totalPages ?? 1;
  const resultCount = products.totalCount ?? products.items.length;
  const hrefBase = {
    q: displayQ,
    sort,
    minPrice,
    maxPrice,
    inStock,
    onSale,
    color,
    ram,
    storage,
  };

  const searchHeader =
    hasActiveFilters && !apiUnavailable ? (
      <CatalogSearchHeader
        q={displayQ}
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

  const filteredResults =
    hasActiveFilters && !apiUnavailable ? (
      <CatalogFilters
        q={displayQ}
        sort={sort}
        minPrice={minPrice}
        maxPrice={maxPrice}
        inStock={inStock}
        onSale={onSale}
        color={color}
        ram={ram}
        storage={storage}
        categories={withLocalizedCategoryNames(
          categories,
          messages.catalog.categoryNames,
        )}
        brands={brands}
        copy={toCatalogFiltersCopy(messages)}
      >
        {searchHeader}
        {productGrid ?? (
          <EmptyState
            title={messages.catalog.emptyTitle}
            description={messages.catalog.emptyDescription}
            icon={productEmptyIcon}
            iconTone="error"
            action={<EmptyStateLink href="/" label={messages.common.backToHome} />}
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
    ) : null;

  const azMeta = getMessages(DEFAULT_LOCALE).meta;

  return (
    <div className="ui-container">
      {!hasActiveFilters ? (
        <h1 className="sr-only">{azMeta.titleDefault}</h1>
      ) : null}
      {!hasActiveFilters && !apiUnavailable ? (
        <LocalizedCatalogHero
          categories={categories}
          brands={brands}
          banners={homeHeroSlides}
        />
      ) : null}
      {apiUnavailable ? (
        <EmptyState
          title={messages.catalog.apiUnavailableTitle}
          description={messages.catalog.apiUnavailableDescription}
          action={<EmptyStateLink href="/" label={messages.common.retry} />}
        />
      ) : hasActiveFilters ? (
        <>
          {showSearchBanner ? (
            <CatalogResultsBanner slides={searchBannerSlides} Image={StorefrontMediaImage} />
          ) : null}
          {filteredResults}
        </>
      ) : (
        <>
          {productGrid}
          {products.items.length > 0 ? (
            <script
              type="application/ld+json"
              suppressHydrationWarning
              dangerouslySetInnerHTML={{
                __html: toJsonLd(
                  buildCollectionPageJsonLd({
                    name: azMeta.titleDefault,
                    description: azMeta.description,
                    path: "/",
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
