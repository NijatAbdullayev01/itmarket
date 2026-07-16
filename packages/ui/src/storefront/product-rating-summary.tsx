import { useId } from "react";

type ProductRatingSummaryProps = {
  averageRating: number | null;
  count: number;
  className?: string;
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
}: ProductRatingSummaryProps) {
  const gradientId = useId();
  const hasReviews = count > 0 && averageRating !== null;
  const rootClassName = [
    "ui-product-rating",
    hasReviews ? null : "ui-product-rating--empty",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={rootClassName}
      aria-label={
        hasReviews
          ? `${formatRating(averageRating)} ulduzdan 5, ${count} rəy`
          : "0 ulduzdan 5, 0 rəy"
      }
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
      <span className="ui-product-rating__score">
        {hasReviews ? formatRating(averageRating) : "0"}
      </span>
      <span className="ui-product-rating__count">{count} rəy</span>
    </div>
  );
}

export type { ProductRatingSummaryProps };
