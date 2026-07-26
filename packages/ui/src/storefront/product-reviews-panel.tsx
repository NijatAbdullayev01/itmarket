import { formatAzDate } from "../utils/format-az-date";
import {
  ProductRatingSummary,
  type ProductRatingSummaryCopy,
} from "./product-rating-summary";
import { IconChat } from "./icons";

export type ProductReviewItem = {
  id: string;
  variantId?: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  authorName: string;
};

export type ProductReviewSummaryValue = {
  averageRating: number | null;
  count: number;
};

export type ProductReviewsPanelCopy = {
  title: string;
  panelAria: string;
  starsAria: string;
  reviewCount?: string;
  ratingAria?: string;
};

export const defaultProductReviewsPanelCopy: ProductReviewsPanelCopy = {
  title: "R\u0259yl\u0259r",
  panelAria: "M\u0259hsul r\u0259yl\u0259ri",
  starsAria: "{rating} ulduzdan 5",
};

export function summarizeProductReviews(
  reviews: Array<{ rating: number }>,
): ProductReviewSummaryValue {
  if (reviews.length === 0) {
    return { averageRating: null, count: 0 };
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return {
    averageRating: Math.round((total / reviews.length) * 10) / 10,
    count: reviews.length,
  };
}

export function filterProductReviewsForVariant(
  reviews: ProductReviewItem[],
  variantId: string | null | undefined,
): ProductReviewItem[] {
  if (variantId === null || variantId === undefined || variantId === "") {
    return reviews;
  }

  return reviews.filter((review) => {
    if (review.variantId === undefined) {
      return true;
    }
    return review.variantId === variantId;
  });
}

type ProductReviewsPanelProps = {
  reviewSummary: {
    averageRating: number | null;
    count: number;
  };
  reviews: ProductReviewItem[];
  copy?: Partial<ProductReviewsPanelCopy>;
};

function formatStarsAria(template: string, rating: number): string {
  return template.replaceAll("{rating}", String(rating));
}

function ReviewStars({
  rating,
  starsAria,
}: {
  rating: number;
  starsAria: string;
}) {
  return (
    <div
      className="ui-product-review__stars"
      aria-label={formatStarsAria(starsAria, rating)}
    >
      {Array.from({ length: 5 }, (_, index) => {
        const filled = index < rating;

        return (
          <svg
            key={index}
            viewBox="0 0 20 20"
            aria-hidden="true"
            className="ui-product-review__star"
          >
            <path
              d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.77l-4.94 2.94.94-5.5-4-3.9 5.53-.8L10 1.5z"
              fill={filled ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </div>
  );
}

export function ProductReviewsPanel({
  reviewSummary,
  reviews,
  copy: copyProp,
}: ProductReviewsPanelProps) {
  const copy = { ...defaultProductReviewsPanelCopy, ...copyProp };
  const ratingCopy: Partial<ProductRatingSummaryCopy> = {
    ...(copy.reviewCount !== undefined ? { reviewCount: copy.reviewCount } : {}),
    ...(copy.ratingAria !== undefined ? { ratingAria: copy.ratingAria } : {}),
  };

  if (reviews.length === 0) {
    return null;
  }

  return (
    <article
      className="ui-product-details__panel ui-product-details__panel--reviews"
      aria-label={copy.panelAria}
    >
      <header className="ui-product-details__header">
        <span className="ui-product-details__icon" aria-hidden="true">
          <IconChat width={20} height={20} />
        </span>
        <h2 className="ui-product-details__title">{copy.title}</h2>
      </header>

      <ProductRatingSummary
        averageRating={reviewSummary.averageRating}
        count={reviewSummary.count}
        className="ui-product-reviews__summary"
        copy={ratingCopy}
      />

      <ul
        className={
          reviews.length > 3
            ? "ui-product-reviews__list ui-product-reviews__list--scroll"
            : "ui-product-reviews__list"
        }
      >
        {reviews.map((review) => {
          const formattedDate = formatAzDate(review.createdAt);

          return (
            <li key={review.id} className="ui-product-review">
              <div className="ui-product-review__header">
                <span className="ui-product-review__author">
                  {review.authorName}
                </span>
                {formattedDate ? (
                  <time
                    className="ui-product-review__date"
                    dateTime={review.createdAt}
                  >
                    {formattedDate}
                  </time>
                ) : null}
              </div>
              <ReviewStars rating={review.rating} starsAria={copy.starsAria} />
              {review.comment ? (
                <p className="ui-product-review__comment">{review.comment}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
