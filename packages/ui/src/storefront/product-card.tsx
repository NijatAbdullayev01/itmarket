import Link from "next/link";

import { IconCart, IconClock } from "./icons";
import type { ReactNode } from "react";

import { Card } from "../primitives/card";
import { Price } from "../primitives/price";
import { formatAznCompact, formatListedAznValue } from "../utils/format-azn";
import { getProductInstallmentTeaser } from "../utils/product-installment-teaser";
import {
  getProductImageAlt,
  getProductImageUrl,
  type ProductMedia,
} from "../utils/product-image";
import { ProductCardActions, ProductCardOverlayActions } from "./product-card-actions";
import { ProductCardInstallmentTeaser } from "./product-card-installment-teaser";
import {
  DefaultMediaImage,
  type MediaImageComponent,
} from "./media-image";
import { ProductRatingSummary } from "./product-rating-summary";

export type ProductCardCopy = {
  addToCart: string;
  addToCartShort: string;
  inStock: string;
  inStockShort: string;
  outOfStock: string;
  outOfStockShort: string;
  availableByOrder: string;
  availableByOrderShort: string;
  preorder: string;
  preorderShort: string;
  priceUnavailable: string;
  storageLabel: string;
  months: string;
  compareTitle: string;
  compareAria: string;
  favoriteTitle: string;
  favoriteAria: string;
  reviewCount: string;
  ratingAria: string;
};

export const defaultProductCardCopy: ProductCardCopy = {
  addToCart: "S\u0259b\u0259t\u0259 at",
  addToCartShort: "S\u0259b\u0259t\u0259 at",
  inStock: "M\u00F6vcuddur",
  inStockShort: "Var",
  outOfStock: "M\u00F6vcud deyil",
  outOfStockShort: "Yoxdur",
  availableByOrder: "M\u00F6vcud ola bil\u0259r",
  availableByOrderShort: "Sifari\u015Fl\u0259",
  preorder: "M\u00F6vcud olanda bildir",
  preorderShort: "M\u0259n\u0259 bildir",
  priceUnavailable: "Sor\u011fu \u0259sas\u0131nda",
  storageLabel: "Daimi yadda\u015F:",
  months: "ay",
  compareTitle: "M\u00FCqayis\u0259 et",
  compareAria: "{name} \u2014 m\u00FCqayis\u0259y\u0259 \u0259lav\u0259 et",
  favoriteTitle: "Sevimli\u0259r\u0259 \u0259lav\u0259 et",
  favoriteAria: "{name} \u2014 sevimli\u0259r\u0259 \u0259lav\u0259 et",
  reviewCount: "{count} rəy",
  ratingAria: "{rating} ulduzdan 5, {count} rəy",
};

type ProductReviewSummary = {
  averageRating: number | null;
  count: number;
};

type ProductCardProps = {
  slug: string;
  name: string;
  href?: string;
  price: string | null;
  previousPrice?: string | null;
  available: number;
  /** When out of stock, product can still be requested by order. */
  availableByOrder?: boolean;
  image?: ProductMedia | null;
  reviewSummary?: ProductReviewSummary;
  permanentStorage?: string | null;
  addToCartSlot?: ReactNode;
  /** When out of stock, replaces the default preorder CTA (e.g. opens modal). */
  preorderSlot?: ReactNode;
  compareButton?: ReactNode;
  favoriteButton?: ReactNode;
  copy?: Partial<ProductCardCopy>;
  /** Optional app-level image renderer (e.g. next/image). */
  Image?: MediaImageComponent;
};

function ProductCardStockStatus({
  tone,
  label,
  labelShort,
  className,
}: {
  tone: "in" | "order" | "out";
  label: string;
  labelShort: string;
  className?: string;
}) {
  return (
    <span
      className={[
        "ui-product-card__stock",
        `ui-product-card__stock--${tone}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
    >
      <span className="ui-product-card__stock-dot" aria-hidden="true" />
      <span className="ui-product-card__stock-label ui-product-card__stock-label--full">
        {label}
      </span>
      <span
        className="ui-product-card__stock-label ui-product-card__stock-label--short"
        aria-hidden="true"
      >
        {labelShort}
      </span>
    </span>
  );
}

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
  href,
  price,
  previousPrice,
  available,
  availableByOrder = false,
  image,
  reviewSummary = { averageRating: null, count: 0 },
  permanentStorage = null,
  addToCartSlot,
  preorderSlot,
  compareButton,
  favoriteButton,
  copy: copyProp,
  Image: ImageComponent = DefaultMediaImage,
}: ProductCardProps) {
  const copy = { ...defaultProductCardCopy, ...copyProp };
  const productHref = href ?? `/products/${slug}`;
  const imageUrl = getProductImageUrl(image);
  const imageAlt = getProductImageAlt(image, name);
  const inStock = available > 0;
  const byOrder = !inStock && availableByOrder === true;
  const stockTone = inStock ? "in" : byOrder ? "order" : "out";
  const stockLabel = inStock
    ? copy.inStock
    : byOrder
      ? copy.availableByOrder
      : copy.outOfStock;
  const stockLabelShort = inStock
    ? copy.inStockShort
    : byOrder
      ? copy.availableByOrderShort
      : copy.outOfStockShort;
  const formattedPrice = formatListedAznValue(price);
  const hasSale =
    previousPrice !== null &&
    previousPrice !== undefined &&
    formattedPrice !== null &&
    Number(previousPrice) > Number(price);
  const saleDiscount =
    hasSale && price !== null && previousPrice !== null
      ? discountAmount(price, previousPrice)
      : null;

  const formattedPreviousPrice =
    hasSale && previousPrice !== null
      ? formatListedAznValue(previousPrice)
      : null;
  const installmentTeaser =
    inStock && formattedPrice !== null
      ? getProductInstallmentTeaser(price)
      : null;
  const hasInstallmentTeaser = installmentTeaser !== null;

  const defaultAddToCart = (
    <Link
      className="ui-btn ui-btn--cta ui-btn--block ui-product-card__cta"
      href={productHref}
      aria-label={copy.addToCart}
    >
      <IconCart width={18} height={18} />
      <span className="ui-product-card__cta-text">
        <span className="ui-product-card__cta-text--full">{copy.addToCart}</span>
        <span className="ui-product-card__cta-text--short" aria-hidden="true">
          {copy.addToCartShort}
        </span>
      </span>
    </Link>
  );

  const defaultPreorder = (
    <Link
      className="ui-btn ui-btn--cta ui-btn--block ui-product-card__cta"
      href={productHref}
      aria-label={copy.preorder}
    >
      <IconClock width={18} height={18} />
      <span className="ui-product-card__cta-text">
        <span className="ui-product-card__cta-text--full">{copy.preorderShort}</span>
        <span className="ui-product-card__cta-text--short" aria-hidden="true">
          {copy.preorderShort}
        </span>
      </span>
    </Link>
  );

  const cartSlot = inStock
    ? (addToCartSlot ?? defaultAddToCart)
    : (preorderSlot ?? defaultPreorder);
  const priceUnavailable = formattedPrice === null;

  return (
    <Card
      className={[
        "ui-product-card",
        priceUnavailable ? "ui-product-card--price-unavailable" : null,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="ui-product-card__media-wrap">
        <Link
          className="ui-product-card__link"
          href={productHref}
          // Full route prefetch while the card is in view (default is partial/PPR only).
          prefetch
        >
          <div className="ui-product-card__media">
            <div className="ui-product-card__badges">
              {saleDiscount !== null ? (
                <span className="ui-product-card__discount-badge">
                  {`\u2212${formatAznCompact(saleDiscount)}`}
                </span>
              ) : null}
              <ProductCardStockStatus
                tone={stockTone}
                label={stockLabel}
                labelShort={stockLabelShort}
                className="ui-product-card__stock--overlay"
              />
            </div>
            <ImageComponent
              src={imageUrl}
              alt={imageAlt}
              loading="lazy"
              width={400}
              height={400}
              sizes="(max-width: 768px) 50vw, 240px"
            />
          </div>
        </Link>
        <ProductCardOverlayActions
          productName={name}
          compareButton={compareButton}
          favoriteButton={favoriteButton}
          copy={{ compareTitle: copy.compareTitle, compareAria: copy.compareAria, favoriteTitle: copy.favoriteTitle, favoriteAria: copy.favoriteAria }}
        />
      </div>

      <div className="ui-product-card__content">
        <div className="ui-product-card__heading">
          <h3 className="ui-product-card__title">
            <Link href={productHref} prefetch>
              {name}
            </Link>
          </h3>

          <ProductRatingSummary
            averageRating={reviewSummary.averageRating}
            count={reviewSummary.count}
            showScore={false}
            className="ui-product-card__rating"
            copy={{
              reviewCount: copy.reviewCount,
              ratingAria: copy.ratingAria,
            }}
          />

          <ProductCardStockStatus
            tone={stockTone}
            label={stockLabel}
            labelShort={stockLabelShort}
            className="ui-product-card__stock--inline"
          />

          {permanentStorage ? (
            <p className="ui-product-card__storage">
              <span className="ui-product-card__storage-label">
                {copy.storageLabel}{" "}
              </span>
              <span className="ui-product-card__storage-value">
                {permanentStorage}
              </span>
            </p>
          ) : null}
        </div>

        <div
          className={[
            "ui-product-card__pricing",
            hasInstallmentTeaser ? "ui-product-card__pricing--with-installment" : null,
            priceUnavailable ? "ui-product-card__pricing--unavailable" : null,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {hasInstallmentTeaser ? (
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
                  {copy.priceUnavailable}
                </span>
              ) : (
                <Price
                  value={formattedPrice}
                  variant={hasSale ? "sale" : "default"}
                  className="ui-product-card__price-current"
                />
              )}
              <ProductCardInstallmentTeaser
                plan={installmentTeaser}
                copy={{ months: copy.months }}
              />
            </>
          ) : (
            <div className="ui-product-card__price-stack">
              {formattedPrice === null ? (
                <span className="ui-price ui-product-card__price-current">
                  {copy.priceUnavailable}
                </span>
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
