import {
  buildProductSpecEntries,
  type ProductRequiredSpecEntry,
} from "../utils/product-spec-entries";
import { ProductReviewsPanel, type ProductReviewItem } from "./product-reviews-panel";
import { ProductSpecsPanel } from "./product-specs-panel";

type ProductInfoProps = {
  requiredSpecs?: ProductRequiredSpecEntry[];
  variantAttributes?: Record<string, string>;
  sku?: string;
  brandName?: string;
  modelName?: string;
  reviewSummary?: {
    averageRating: number | null;
    count: number;
  };
  reviews?: ProductReviewItem[];
};

export function ProductInfo({
  requiredSpecs,
  variantAttributes,
  sku,
  brandName,
  modelName,
  reviewSummary,
  reviews = [],
}: ProductInfoProps) {
  const specEntries = buildProductSpecEntries({
    sku,
    brandName,
    modelName,
    requiredSpecs,
    variantAttributes,
  });
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
