import { useId } from "react";

import { formatChromeMessage } from "./chrome-copy";

export type ProductRatingSummaryCopy = {
  /** Template with `{count}`, e.g. "{count} rəy". */
  reviewCount: string;
  /** Template with `{rating}` and `{count}`, e.g. "{rating} ulduzdan 5, {count} rəy". */
  ratingAria: string;
};

export const defaultProductRatingSummaryCopy: ProductRatingSummaryCopy = {
  reviewCount: "{count} rəy",
  ratingAria: "{rating} ulduzdan 5, {count} rəy",
};

type ProductRatingSummaryProps = {
  averageRating: number | null;
  count: number;
  className?: string;
  showScore?: boolean;
  copy?: Partial<ProductRatingSummaryCopy>;
};

function formatRating(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function StarIcon({
  filled,
  gradientId,
}: {
  filled: "full" | "half" | "empty";
  gradientId: string;
}) {
  if (filled === "empty") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true" className="ui-product-rating__star">
        <path
          d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.77l-4.94 2.94.94-5.5-4-3.9 5.53-.8L10 1.5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (filled === "half") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true" className="ui-product-rating__star">
        <defs>
          <linearGradient id={gradientId}>
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <path
          d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.77l-4.94 2.94.94-5.5-4-3.9 5.53-.8L10 1.5z"
          fill={`url(#${gradientId})`}
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="ui-product-rating__star">
      <path
        d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.77l-4.94 2.94.94-5.5-4-3.9 5.53-.8L10 1.5z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getStarFill(index: number, averageRating: number): "full" | "half" | "empty" {
  const threshold = index + 1;
  if (averageRating >= threshold) return "full";
  if (averageRating >= threshold - 0.5) return "half";
  return "empty";
}

export function ProductRatingSummary({
  averageRating,
  count,
  className,
  showScore = true,
  copy: copyProp,
}: ProductRatingSummaryProps) {
  const copy = { ...defaultProductRatingSummaryCopy, ...copyProp };
  const gradientId = useId();
  const hasReviews = count > 0 && averageRating !== null;
  const rootClassName = [
    "ui-product-rating",
    hasReviews ? null : "ui-product-rating--empty",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const ratingValue = hasReviews ? formatRating(averageRating) : "0";

  return (
    <div
      className={rootClassName}
      aria-label={formatChromeMessage(copy.ratingAria, {
        rating: ratingValue,
        count,
      })}
    >
      <div className="ui-product-rating__stars" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <StarIcon
            key={index}
            gradientId={gradientId}
            filled={
              hasReviews ? getStarFill(index, averageRating) : "empty"
            }
          />
        ))}
      </div>
      {showScore ? (
        <span className="ui-product-rating__score">{ratingValue}</span>
      ) : null}
      <span className="ui-product-rating__count">
        ({formatChromeMessage(copy.reviewCount, { count })})
      </span>
    </div>
  );
}

export type { ProductRatingSummaryProps };
