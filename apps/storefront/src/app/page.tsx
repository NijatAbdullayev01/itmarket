import {
  CatalogFilters,
  CatalogHero,
  CatalogResultsBanner,
  CatalogSearchHeader,
  EmptyState,
  EmptyStateLink,
  IconAlertCircle,
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
  type CategorySummary,
  type ProductSummary,
} from "@/lib/api";
import { getGuestCartSession } from "@/lib/cart-session";
import { getCartVariantIds } from "@/lib/cart-variant-ids";

const productEmptyIcon = <IconAlertCircle width={40} height={40} />;

export const dynamic = "force-dynamic";

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
  }>;
}) {
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
  } = await searchParams;
  const minPrice = parseOptionalNumber(minPriceParam);
  const maxPrice = parseOptionalNumber(maxPriceParam);
  const inStock = parseOptionalFlag(inStockParam);
  const onSale = parseOptionalFlag(onSaleParam);
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

  let categories: CategorySummary[] = [];
  let brands: BrandSummary[] = [];
  let banners: BannerSummary[] = [];
  let products: { items: ProductSummary[]; nextCursor: string | null } = {
    items: [],
    nextCursor: null,
  };
  let apiUnavailable = false;
  const cartSession = await getGuestCartSession();
  const cartVariantIds = await getCartVariantIds(cartSession.cartId);

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

  const matchedBrandFromQuery = matchCatalogBrandByQuery(q, brands);
  const effectiveBrand = brand ?? matchedBrandFromQuery?.slug;
  const qMatchesActiveBrand = catalogQueryMatchesBrand(
    q,
    effectiveBrand,
    brands,
  );
  const filters: CatalogFilter = {
    search: qMatchesActiveBrand ? undefined : q,
    category,
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
  const categoryName = category
    ? (categories.find((entry) => entry.slug === category)?.name ?? category)
    : undefined;
  const brandName = effectiveBrand
    ? (brands.find((entry) => entry.slug === effectiveBrand)?.name ??
      effectiveBrand)
    : undefined;
  const displayQ = qMatchesActiveBrand ? undefined : q;
  const searchHeader =
    hasActiveFilters && !apiUnavailable ? (
      <CatalogSearchHeader
        q={displayQ}
        category={category}
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
        resultCount={products.items.length}
      />
    ) : null;

  const productGrid =
    products.items.length > 0 ? (
      <div className="ui-product-grid">
        {products.items.map((product) => (
          <CatalogProductCard
            key={product.defaultVariantId ?? product.id}
            product={product}
            cartId={cartSession.cartId}
            cartVariantIds={cartVariantIds}
          />
        ))}
      </div>
    ) : null;

  const filteredResults =
    hasActiveFilters && !apiUnavailable ? (
      <CatalogFilters
        q={displayQ}
        category={category}
        brand={effectiveBrand}
        sort={sort}
        minPrice={minPrice}
        maxPrice={maxPrice}
        inStock={inStock}
        onSale={onSale}
        color={color}
        ram={ram}
        storage={storage}
        categories={categories}
        brands={brands}
      >
        {searchHeader}
        {productGrid ?? (
          <EmptyState
            title="Məhsul tapılmadı"
            description="Axtarış və ya filterə uyğun məhsul tapılmadı. Sorğunu dəyişib yenidən yoxlayın."
            icon={productEmptyIcon}
            iconTone="error"
            action={<EmptyStateLink href="/" label="Ana səhifəyə qayıt" />}
          />
        )}
      </CatalogFilters>
    ) : null;

  return (
    <div className="ui-container">
      {!hasActiveFilters && !apiUnavailable ? (
        <CatalogHero
          categories={categories}
          brands={brands}
          banners={homeHeroSlides}
        />
      ) : null}
      {apiUnavailable ? (
        <EmptyState
          title="Kataloq hazır deyil"
          description="API server hazır deyil. Zəhmət olmasa bir az sonra yenidən yoxlayın."
          action={<EmptyStateLink href="/" label="Yenidən yoxla" />}
        />
      ) : hasActiveFilters ? (
        <>
          {showSearchBanner ? (
            <CatalogResultsBanner slides={searchBannerSlides} />
          ) : null}
          {filteredResults}
        </>
      ) : (
        productGrid
      )}
    </div>
  );
}
