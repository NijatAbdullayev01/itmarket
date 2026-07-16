import { ProductReviewsPanel, type ProductReviewItem } from "./product-reviews-panel";
import { ProductSpecsPanel } from "./product-specs-panel";

type ProductInfoProps = {
  attributes?: Record<string, string>;
  sku?: string;
  reviewSummary?: {
    averageRating: number | null;
    count: number;
  };
  reviews?: ProductReviewItem[];
};

export function ProductInfo({
  attributes,
  sku,
  reviewSummary,
  reviews = [],
}: ProductInfoProps) {
  const attributeEntries =
    attributes && Object.keys(attributes).length > 0
      ? Object.entries(attributes)
      : [];
  const specEntries = [
    ...(sku ? [["SKU", sku] as const] : []),
    ...attributeEntries,
  ];
  const hasReviews = reviews.length > 0;

  if (specEntries.length === 0 && !hasReviews) {
    return null;
  }

  return (
    <section className="ui-product-details" aria-label="Məhsul təfərrüatları">
      <div className="ui-product-details__grid">
        {specEntries.length > 0 ? (
          <ProductSpecsPanel entries={specEntries} />
        ) : null}
        {hasReviews && reviewSummary ? (
          <ProductReviewsPanel
            reviewSummary={reviewSummary}
            reviews={reviews}
          />
        ) : null}
      </div>
    </section>
  );
}
