import {
  buildProductSpecEntries,
  type ProductRequiredSpecEntry,
  type ProductSpecEntry,
} from "../utils/product-spec-entries";
import {
  ProductReviewsPanel,
  type ProductReviewItem,
  type ProductReviewsPanelCopy,
} from "./product-reviews-panel";
import {
  ProductSpecsPanel,
  type ProductSpecsPanelCopy,
} from "./product-specs-panel";

export type ProductInfoCopy = {
  detailsAria: string;
  specs?: Partial<ProductSpecsPanelCopy>;
  reviews?: Partial<ProductReviewsPanelCopy>;
};

export const defaultProductInfoCopy: ProductInfoCopy = {
  detailsAria: "M\u0259hsul t\u0259f\u0259rr\u00FCatlar\u0131",
};

type ProductInfoProps = {
  requiredSpecs?: ProductRequiredSpecEntry[];
  variantAttributes?: Record<string, string>;
  sku?: string;
  brandName?: string;
  modelName?: string;
  /** When provided, skips rebuilding from requiredSpecs / attributes. */
  entries?: ProductSpecEntry[];
  reviewSummary?: {
    averageRating: number | null;
    count: number;
  };
  reviews?: ProductReviewItem[];
  copy?: Partial<ProductInfoCopy>;
};

export function ProductInfo({
  requiredSpecs,
  variantAttributes,
  sku,
  brandName,
  modelName,
  entries: entriesProp,
  reviewSummary,
  reviews = [],
  copy: copyProp,
}: ProductInfoProps) {
  const copy = { ...defaultProductInfoCopy, ...copyProp };
  const specEntries =
    entriesProp ??
    buildProductSpecEntries({
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
    <section className="ui-product-details" aria-label={copy.detailsAria}>
      <div className="ui-product-details__grid">
        {specEntries.length > 0 ? (
          <ProductSpecsPanel entries={specEntries} copy={copy.specs} />
        ) : null}
        {hasReviews && reviewSummary ? (
          <ProductReviewsPanel
            reviewSummary={reviewSummary}
            reviews={reviews}
            copy={copy.reviews}
          />
        ) : null}
      </div>
    </section>
  );
}
