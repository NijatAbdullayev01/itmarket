import { CatalogProductCard } from "@/components/catalog-product-card";
import { listSimilarProducts } from "@/lib/api";

type SimilarProductsSectionProps = {
  slug: string;
  cartId?: string;
  cartVariantIds?: string[];
};

export async function SimilarProductsSection({
  slug,
  cartId,
  cartVariantIds = [],
}: SimilarProductsSectionProps) {
  const { items } = await listSimilarProducts(slug);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="ui-product-similar" aria-label="Bənzər məhsullar">
      <header className="ui-product-similar__header">
        <h2 className="ui-section-heading">Bənzər məhsullar</h2>
      </header>
      <div className="ui-product-grid">
        {items.map((product) => (
          <CatalogProductCard
            key={product.id}
            product={product}
            cartId={cartId}
            cartVariantIds={cartVariantIds}
          />
        ))}
      </div>
    </section>
  );
}
