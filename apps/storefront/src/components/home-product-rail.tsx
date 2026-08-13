import { CatalogProductCard } from "@/components/catalog-product-card";
import type { ProductSummary } from "@/lib/api";
import { DealProductRail, type DealProductRailCopy } from "@itmarket/ui";

type HomeProductRailProps = {
  title: string;
  ariaLabel: string;
  products: ProductSummary[];
  variant?: "grid" | "deal";
  dealCopy?: Partial<DealProductRailCopy>;
};

export function HomeProductRail({
  title,
  ariaLabel,
  products,
  variant = "grid",
  dealCopy,
}: HomeProductRailProps) {
  if (products.length === 0) {
    return null;
  }

  const cards = products.map((product) => (
    <CatalogProductCard
      key={product.defaultVariantId ?? product.id}
      product={product}
    />
  ));

  if (variant === "deal") {
    return (
      <DealProductRail title={title} ariaLabel={ariaLabel} copy={dealCopy}>
        {cards}
      </DealProductRail>
    );
  }

  return (
    <section className="ui-home-rail" aria-label={ariaLabel}>
      <header className="ui-home-rail__header">
        <h2 className="ui-section-heading">{title}</h2>
      </header>
      <div className="ui-product-grid">{cards}</div>
    </section>
  );
}
