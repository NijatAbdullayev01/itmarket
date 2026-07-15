"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { Price } from "../primitives/price";
import { formatAzn } from "../utils/format-azn";
import {
  getProductImageAlt,
  getProductImageUrl,
  type ProductMedia,
} from "../utils/product-image";
import { IconCart } from "./icons";

type WeeklyOfferProps = {
  product: {
    slug: string;
    name: string;
    price: string | null;
    previousPrice: string | null;
    image: ProductMedia | null;
  };
  addToCartSlot?: ReactNode;
};

function getEndOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  const end = new Date(now);
  end.setDate(now.getDate() + daysUntilSunday);
  end.setHours(23, 59, 59, 999);
  return end;
}

function getTimeLeft(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  return { days, hours, minutes };
}

export function WeeklyOffer({ product, addToCartSlot }: WeeklyOfferProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(getEndOfWeek()));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft(getTimeLeft(getEndOfWeek()));
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const imageUrl = getProductImageUrl(product.image);
  const imageAlt = getProductImageAlt(product.image, product.name);
  const hasSale =
    product.previousPrice !== null &&
    product.price !== null &&
    Number(product.previousPrice) > Number(product.price);

  const defaultAction = (
    <Link
      className="ui-weekly-offer__cta"
      href={`/products/${product.slug}`}
    >
      <IconCart width={18} height={18} />
      Səbətə at
    </Link>
  );

  return (
    <aside className="ui-weekly-offer" aria-label="Həftənin təklifləri">
      <h2 className="ui-weekly-offer__heading">Həftənin təklifləri</h2>

      <div className="ui-weekly-offer__countdown" aria-live="polite">
        <div className="ui-weekly-offer__countdown-item">
          <span className="ui-weekly-offer__countdown-value">{timeLeft.days}</span>
          <span className="ui-weekly-offer__countdown-label">gün</span>
        </div>
        <div className="ui-weekly-offer__countdown-item">
          <span className="ui-weekly-offer__countdown-value">{timeLeft.hours}</span>
          <span className="ui-weekly-offer__countdown-label">saat</span>
        </div>
        <div className="ui-weekly-offer__countdown-item">
          <span className="ui-weekly-offer__countdown-value">{timeLeft.minutes}</span>
          <span className="ui-weekly-offer__countdown-label">dəqiqə</span>
        </div>
      </div>

      <Link className="ui-weekly-offer__product-link" href={`/products/${product.slug}`}>
        <p className="ui-weekly-offer__name">{product.name}</p>
        <div className="ui-weekly-offer__pricing">
          {product.price === null ? (
            <span className="ui-price">Qiymət yoxdur</span>
          ) : (
            <>
              <Price
                value={formatAzn(Number(product.price))}
                variant={hasSale ? "sale" : "default"}
                className="ui-weekly-offer__price"
              />
              {hasSale && product.previousPrice !== null ? (
                <Price
                  value={formatAzn(Number(product.previousPrice))}
                  variant="previous"
                  className="ui-weekly-offer__price-old"
                />
              ) : null}
            </>
          )}
        </div>
        {product.price !== null ? (
          <span className="ui-weekly-offer__installment">0% 12 ay</span>
        ) : null}
        <div className="ui-weekly-offer__image-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={imageAlt} loading="lazy" />
        </div>
      </Link>

      {addToCartSlot ?? defaultAction}

      <Link className="ui-weekly-offer__all" href="/?sort=price">
        Bütün təklifləri gör
      </Link>
    </aside>
  );
}
