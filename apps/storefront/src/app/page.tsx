import {
  CatalogFilters,
  EmptyState,
  EmptyStateLink,
  ProductCard,
  TrustFeatures,
} from "@itmarket/ui";
import {
  listBrands,
  listCategories,
  listProducts,
  type CatalogFilter,
} from "@/lib/api";

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
  const [{ q, category, brand, sort }, categories, brands] = await Promise.all([
    searchParams,
    listCategories(),
    listBrands(),
  ]);
  const filters: CatalogFilter = {
    search: q,
    category,
    brand,
    sort,
  };
  const products = await listProducts(filters);

  return (
    <div className="ui-container">
      <CatalogFilters
        q={q}
        category={category}
        brand={brand}
        sort={sort}
        categories={categories}
        brands={brands}
        resultCount={products.items.length}
      />
      {products.items.length === 0 ? (
        <EmptyState
          title="Məhsul tapılmadı"
          description="Filterləri dəyişin və ya bir az sonra yenidən yoxlayın."
          action={<EmptyStateLink href="/" label="Filterləri təmizlə" />}
        />
      ) : (
        <div className="ui-product-grid">
          {products.items.map((product) => (
            <ProductCard
              key={product.id}
              slug={product.slug}
              name={product.name}
              brandName={product.brand?.name}
              price={product.price}
              previousPrice={product.previousPrice}
              available={product.available}
              image={product.image}
            />
          ))}
        </div>
      )}
      <TrustFeatures />
    </div>
  );
}
