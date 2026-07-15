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
  brandName?: string | null;
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
  brandName,
  price,
  previousPrice,
  available,
  image,
  addToCartSlot,
}: ProductCardProps) {
  const imageUrl = getProductImageUrl(image);
  const imageAlt = getProductImageAlt(image, name);
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
      className="ui-btn ui-btn--cta ui-btn--block"
      href={`/products/${slug}`}
    >
      Səbətə at
    </Link>
  );

  const cartSlot =
    available > 0 ? (addToCartSlot ?? defaultAddToCart) : (
      <span className="ui-btn ui-btn--block ui-btn--disabled" aria-disabled="true">
        Stokda yoxdur
      </span>
    );

  const stockLabel = available > 0 ? "Stokda var" : "Stokda yoxdur";
  const stockClass =
    available > 0
      ? "ui-product-card__stock ui-product-card__stock--in"
      : "ui-product-card__stock ui-product-card__stock--out";

  return (
    <Card className="ui-product-card">
      <div className="ui-product-card__media-wrap">
        <Link className="ui-product-card__link" href={`/products/${slug}`}>
          <div className="ui-product-card__media">
            {salePercent !== null ? (
              <span className="ui-product-card__discount-badge">
                -{salePercent}%
              </span>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={imageAlt} loading="lazy" />
          </div>
        </Link>
        <ProductCardOverlayActions productName={name} />
      </div>

      <span className={stockClass}>{stockLabel}</span>

      {brandName ? <p className="ui-product-card__brand">{brandName}</p> : null}

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

      {price !== null && available > 0 ? (
        <span className="ui-product-card__installment">Faizsiz taksit</span>
      ) : null}

      <ProductCardActions addToCartSlot={cartSlot} />
    </Card>
  );
}
