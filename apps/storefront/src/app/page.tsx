import {
  CatalogFilters,
  CatalogHero,
  EmptyState,
  EmptyStateLink,
  TrustFeatures,
} from "@itmarket/ui";
import { addToCart } from "@/app/actions";
import { CatalogProductCard } from "@/components/catalog-product-card";
import {
  ApiUnavailableError,
  listBrands,
  listCategories,
  listProducts,
  type BrandSummary,
  type CatalogFilter,
  type CategorySummary,
  type ProductSummary,
} from "@/lib/api";
import { getGuestCartSession } from "@/lib/cart-session";

export const dynamic = "force-dynamic";

function pickFeaturedProduct(
  products: ProductSummary[],
): ProductSummary | null {
  const onSale = products.find(
    (product) =>
      product.price !== null &&
      product.previousPrice !== null &&
      Number(product.previousPrice) > Number(product.price),
  );
  return onSale ?? products[0] ?? null;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    brand?: string;
    sort?: "newest" | "name" | "price";
  }>;
}) {
  const { q, category, brand, sort } = await searchParams;
  const filters: CatalogFilter = {
    search: q,
    category,
    brand,
    sort,
  };
  const hasActiveFilters = Boolean(q || category || brand);

  let categories: CategorySummary[] = [];
  let brands: BrandSummary[] = [];
  let products: { items: ProductSummary[]; nextCursor: string | null } = {
    items: [],
    nextCursor: null,
  };
  let apiUnavailable = false;
  const cartSession = await getGuestCartSession();

  try {
    [categories, brands] = await Promise.all([listCategories(), listBrands()]);
    products = await listProducts(filters);
  } catch (error) {
    if (!(error instanceof ApiUnavailableError)) {
      throw error;
    }
    apiUnavailable = true;
  }

  const featuredProduct = pickFeaturedProduct(products.items);
  const weeklyOfferAction =
    featuredProduct !== null &&
    featuredProduct.available > 0 &&
    featuredProduct.defaultVariantId !== null ? (
      <form action={addToCart}>
        <input type="hidden" name="cartId" value={cartSession.cartId ?? ""} />
        <input
          type="hidden"
          name="variantId"
          value={featuredProduct.defaultVariantId!}
        />
        <input type="hidden" name="quantity" value="1" />
        <button type="submit" className="ui-weekly-offer__cta">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="9" cy="20" r="1" />
            <circle cx="17" cy="20" r="1" />
            <path d="M3 3h2l1.6 9.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 7H7" />
          </svg>
          Səbətə at
        </button>
      </form>
    ) : undefined;

  return (
    <div className="ui-container">
      {!hasActiveFilters && !apiUnavailable ? (
        <>
          <CatalogHero
            categories={categories}
            brands={brands}
            featuredProduct={featuredProduct}
            weeklyOfferAction={weeklyOfferAction}
          />
          <TrustFeatures />
        </>
      ) : null}
      <CatalogFilters
        q={q}
        category={category}
        brand={brand}
        sort={sort}
        categories={categories}
        brands={brands}
        resultCount={products.items.length}
      >
        {apiUnavailable ? (
          <EmptyState
            title="Kataloq hazır deyil"
            description="API server hazır deyil. Zəhmət olmasa bir az sonra yenidən yoxlayın."
            action={<EmptyStateLink href="/" label="Yenidən yoxla" />}
          />
        ) : products.items.length === 0 ? (
          <EmptyState
            title="Məhsul tapılmadı"
            description="Filterləri dəyişin və ya bir az sonra yenidən yoxlayın."
            action={<EmptyStateLink href="/" label="Filterləri təmizlə" />}
          />
        ) : (
          <div className="ui-product-grid">
            {products.items.map((product) => (
              <CatalogProductCard
                key={product.id}
                product={product}
                cartId={cartSession.cartId}
              />
            ))}
          </div>
        )}
      </CatalogFilters>
    </div>
  );
}
