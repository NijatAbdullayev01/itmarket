import { describe, expect, it } from "vitest";
import {
  filterProductReviewsForVariant,
  summarizeProductReviews,
  type ProductReviewItem,
} from "@itmarket/ui";

const reviews: ProductReviewItem[] = [
  {
    id: "r1",
    variantId: "v1",
    rating: 5,
    comment: "Əla",
    createdAt: "2026-01-01T00:00:00.000Z",
    authorName: "Aysel",
  },
  {
    id: "r2",
    variantId: "v2",
    rating: 2,
    comment: "Zəif",
    createdAt: "2026-01-02T00:00:00.000Z",
    authorName: "Nicat",
  },
  {
    id: "r3",
    variantId: "v1",
    rating: 4,
    comment: null,
    createdAt: "2026-01-03T00:00:00.000Z",
    authorName: "Elvin",
  },
];

describe("variant-scoped product reviews", () => {
  it("yalnız seçilmiş variantın rəylərini hesablayır", () => {
    const variantReviews = filterProductReviewsForVariant(reviews, "v1");
    expect(variantReviews).toHaveLength(2);
    expect(summarizeProductReviews(variantReviews)).toEqual({
      averageRating: 4.5,
      count: 2,
    });
    expect(summarizeProductReviews(filterProductReviewsForVariant(reviews, "v2"))).toEqual({
      averageRating: 2,
      count: 1,
    });
  });
});
