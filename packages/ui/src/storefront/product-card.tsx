import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "../primitives/card";
import { Price } from "../primitives/price";
import { formatAzn, formatAznValue } from "../utils/format-azn";
import { getProductInstallmentTeaser } from "../utils/product-installment-teaser";
import {
  getProductImageAlt,
  getProductImageUrl,
  type ProductMedia,
} from "../utils/product-image";
import { ProductCardActions, ProductCardOverlayActions } from "./product-card-actions";
import { ProductRatingSummary } from "./product-rating-summary";

type ProductReviewSummary = {
  averageRating: number | null;
  count: number;
};

type ProductCardProps = {
  slug: string;
  name: string;
  price: string | null;
  previousPrice?: string | null;
  available: number;
  image?: ProductMedia | null;
  reviewSummary?: ProductReviewSummary;
  addToCartSlot?: ReactNode;
  compareButton?: ReactNode;
  favoriteButton?: ReactNode;
};

function discountAmount(
  price: string,
  previousPrice: string,
): number | null {
  const current = Number(price);
  const previous = Number(previousPrice);
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous <= current) return null;
  return previous - current;
}

export function ProductCard({
  slug,
  name,
  price,
  previousPrice,
  available,
  image,
  reviewSummary = { averageRating: null, count: 0 },
  addToCartSlot,
  compareButton,
  favoriteButton,
}: ProductCardProps) {
  const imageUrl = getProductImageUrl(image);
  const imageAlt = getProductImageAlt(image, name);
  const inStock = available > 0;
  const hasSale =
    previousPrice !== null &&
    previousPrice !== undefined &&
    price !== null &&
    Number(previousPrice) > Number(price);
  const saleDiscount =
    hasSale && price !== null && previousPrice !== null
      ? discountAmount(price, previousPrice)
      : null;

  const formattedPrice = formatAznValue(price);
  const formattedPreviousPrice =
    hasSale && previousPrice !== null
      ? formatAznValue(previousPrice)
      : null;
  const installmentTeaser =
    inStock && price !== null ? getProductInstallmentTeaser(price) : null;

  const defaultAddToCart = (
    <Link
      className="ui-btn ui-btn--cta ui-btn--block ui-product-card__cta"
      href={`/products/${slug}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        width={18}
        height={18}
        aria-hidden="true"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      Səbətə at
    </Link>
  );

  const cartSlot = inStock ? (
    addToCartSlot ?? defaultAddToCart
  ) : (
    <span
      className="ui-btn ui-btn--block ui-btn--disabled ui-product-card__cta"
      aria-disabled="true"
    >
      Stokda yoxdur
    </span>
  );

  return (
    <Card className="ui-product-card">
      <div className="ui-product-card__media-wrap">
        <Link className="ui-product-card__link" href={`/products/${slug}`}>
          <div className="ui-product-card__media">
            <div className="ui-product-card__badges">
              {saleDiscount !== null ? (
                <span className="ui-product-card__discount-badge">
                  −{formatAzn(saleDiscount)}
                </span>
              ) : null}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={imageAlt} loading="lazy" />
          </div>
        </Link>
        <ProductCardOverlayActions
          productName={name}
          compareButton={compareButton}
          favoriteButton={favoriteButton}
        />
      </div>

      <div className="ui-product-card__content">
        <div className="ui-product-card__heading">
          <h3 className="ui-product-card__title">
            <Link href={`/products/${slug}`}>{name}</Link>
          </h3>

          <ProductRatingSummary
            averageRating={reviewSummary.averageRating}
            count={reviewSummary.count}
            showScore={false}
            className="ui-product-card__rating"
          />
        </div>

        <div
          className={[
            "ui-product-card__pricing",
            installmentTeaser ? "ui-product-card__pricing--with-installment" : null,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {installmentTeaser ? (
            <>
              {formattedPreviousPrice !== null ? (
                <Price
                  value={formattedPreviousPrice}
                  variant="previous"
                  className="ui-product-card__price-old"
                />
              ) : null}
              {formattedPrice === null ? (
                <span className="ui-price ui-product-card__price-current">
                  Qiymət yoxdur
                </span>
              ) : (
                <Price
                  value={formattedPrice}
                  variant={hasSale ? "sale" : "default"}
                  className="ui-product-card__price-current"
                />
              )}
              <span className="ui-product-card__installment-teaser-amount">
                {installmentTeaser.monthlyAmountFormatted}
                <span className="ui-product-card__installment-teaser-duration">
                  {" / "}
                  {installmentTeaser.months} ay
                </span>
              </span>
            </>
          ) : (
            <div className="ui-product-card__price-stack">
              {formattedPrice === null ? (
                <span className="ui-price">Qiymət yoxdur</span>
              ) : (
                <>
                  {formattedPreviousPrice !== null ? (
                    <Price
                      value={formattedPreviousPrice}
                      variant="previous"
                      className="ui-product-card__price-old"
                    />
                  ) : null}
                  <Price
                    value={formattedPrice}
                    variant={hasSale ? "sale" : "default"}
                    className="ui-product-card__price-current"
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <ProductCardActions addToCartSlot={cartSlot} />
    </Card>
  );
}
