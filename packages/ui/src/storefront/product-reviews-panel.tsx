import { ProductRatingSummary } from "./product-rating-summary";
import { IconChat } from "./icons";

export type ProductReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  authorName: string;
};

type ProductReviewsPanelProps = {
  reviewSummary: {
    averageRating: number | null;
    count: number;
  };
  reviews: ProductReviewItem[];
};

function formatReviewDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("az-AZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div
      className="ui-product-review__stars"
      aria-label={`${rating} ulduzdan 5`}
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
}: ProductReviewsPanelProps) {
  if (reviews.length === 0) {
    return null;
  }

  return (
    <article
      className="ui-product-details__panel ui-product-details__panel--reviews"
      aria-label="Məhsul rəyləri"
    >
      <header className="ui-product-details__header">
        <span className="ui-product-details__icon" aria-hidden="true">
          <IconChat width={20} height={20} />
        </span>
        <h2 className="ui-product-details__title">Rəylər</h2>
      </header>

      <ProductRatingSummary
        averageRating={reviewSummary.averageRating}
        count={reviewSummary.count}
        className="ui-product-reviews__summary"
      />

      <ul className="ui-product-reviews__list">
        {reviews.map((review) => {
          const formattedDate = formatReviewDate(review.createdAt);

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
              <ReviewStars rating={review.rating} />
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
