import {
  CatalogHero,
  EmptyState,
  EmptyStateLink,
  IconAlertCircle,
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
import { getCartVariantIds } from "@/lib/cart-variant-ids";

const productEmptyIcon = <IconAlertCircle width={40} height={40} />;

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
  const cartVariantIds = await getCartVariantIds(cartSession.cartId);

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
      ) : products.items.length === 0 && hasActiveFilters ? (
        <EmptyState
          title="Məhsul tapılmadı"
          description="Axtarış və ya filterə uyğun məhsul tapılmadı. Sorğunu dəyişib yenidən yoxlayın."
          icon={productEmptyIcon}
          iconTone="error"
          action={<EmptyStateLink href="/" label="Ana səhifəyə qayıt" />}
        />
      ) : products.items.length > 0 ? (
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
      ) : null}
    </div>
  );
}
