import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "../primitives/card";
import { Price } from "../primitives/price";
import { formatAzn } from "../utils/format-azn";
import {
  getProductImageAlt,
  getProductImageUrl,
  type ProductMedia,
} from "../utils/product-image";
import { ProductCardActions, ProductCardOverlayActions } from "./product-card-actions";

type ProductCardProps = {
  slug: string;
  name: string;
  price: string | null;
  previousPrice?: string | null;
  available: number;
  image?: ProductMedia | null;
  addToCartSlot?: ReactNode;
};

function discountPercent(
  price: string,
  previousPrice: string,
): number | null {
  const current = Number(price);
  const previous = Number(previousPrice);
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous <= current) return null;
  return Math.round(((previous - current) / previous) * 100);
}

export function ProductCard({
  slug,
  name,
  price,
  previousPrice,
  available,
  image,
  addToCartSlot,
}: ProductCardProps) {
  const imageUrl = getProductImageUrl(image);
  const imageAlt = getProductImageAlt(image, name);
  const inStock = available > 0;
  const hasSale =
    previousPrice !== null &&
    previousPrice !== undefined &&
    price !== null &&
    Number(previousPrice) > Number(price);
  const salePercent =
    hasSale && price !== null && previousPrice !== null
      ? discountPercent(price, previousPrice)
      : null;

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

  const stockLabel = inStock ? "Stokda var" : "Stokda yoxdur";
  const stockClass = inStock
    ? "ui-product-card__stock ui-product-card__stock--in"
    : "ui-product-card__stock ui-product-card__stock--out";

  return (
    <Card className="ui-product-card">
      <div className="ui-product-card__media-wrap">
        <Link className="ui-product-card__link" href={`/products/${slug}`}>
          <div className="ui-product-card__media">
            <div className="ui-product-card__badges">
              {salePercent !== null ? (
                <span className="ui-product-card__discount-badge">
                  -{salePercent}%
                </span>
              ) : null}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={imageAlt} loading="lazy" />
          </div>
        </Link>
        <ProductCardOverlayActions productName={name} />
      </div>

      <div className="ui-product-card__content">
        <h3 className="ui-product-card__title">
          <Link href={`/products/${slug}`}>{name}</Link>
        </h3>

        <div className="ui-product-card__pricing">
          {price === null ? (
            <span className="ui-price">Qiymət yoxdur</span>
          ) : (
            <>
              <Price
                value={formatAzn(Number(price))}
                variant={hasSale ? "sale" : "default"}
                className="ui-product-card__price-current"
              />
              {hasSale && previousPrice !== null ? (
                <Price
                  value={formatAzn(Number(previousPrice))}
                  variant="previous"
                  className="ui-product-card__price-old"
                />
              ) : null}
            </>
          )}
        </div>

        <div className="ui-product-card__meta">
          {price !== null && inStock ? (
            <span className="ui-product-card__installment">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width={14}
                height={14}
                aria-hidden="true"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              Faizsiz taksit
            </span>
          ) : null}
          <span className={stockClass}>
            <span className="ui-product-card__stock-dot" aria-hidden="true" />
            {stockLabel}
          </span>
        </div>
      </div>

      <ProductCardActions addToCartSlot={cartSlot} />
    </Card>
  );
}
