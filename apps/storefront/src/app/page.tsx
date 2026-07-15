import {
  CatalogHero,
  EmptyState,
  EmptyStateLink,
  TrustFeatures,
} from "@itmarket/ui";
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

  return (
    <div className="ui-container">
      {!hasActiveFilters && !apiUnavailable ? (
        <>
          <CatalogHero categories={categories} brands={brands} />
          <TrustFeatures />
        </>
      ) : null}
      {apiUnavailable ? (
        <EmptyState
          title="Kataloq hazır deyil"
          description="API server hazır deyil. Zəhmət olmasa bir az sonra yenidən yoxlayın."
          action={<EmptyStateLink href="/" label="Yenidən yoxla" />}
        />
      ) : products.items.length === 0 ? (
        <EmptyState
          title="Məhsul tapılmadı"
          description="Hal-hazırda göstəriləcək məhsul yoxdur. Bir az sonra yenidən yoxlayın."
          action={<EmptyStateLink href="/" label="Ana səhifəyə qayıt" />}
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
    </div>
  );
}
