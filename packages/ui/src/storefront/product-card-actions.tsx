"use client";

import type { ReactNode } from "react";

import { IconCompare, IconHeart } from "./icons";

type ProductCardActionsProps = {
  addToCartSlot: ReactNode;
};

export function ProductCardActions({ addToCartSlot }: ProductCardActionsProps) {
  return <div className="ui-product-card__actions">{addToCartSlot}</div>;
}

type ProductCardOverlayActionsProps = {
  productName: string;
  compareButton?: ReactNode;
  favoriteButton?: ReactNode;
};

export function ProductCardOverlayActions({
  productName,
  compareButton,
  favoriteButton,
}: ProductCardOverlayActionsProps) {
  return (
    <div className="ui-product-card__quick-actions">
      {compareButton ?? (
        <button
          type="button"
          className="ui-product-card__icon-btn"
          aria-label={`${productName} — müqayisəyə əlavə et`}
          title="Müqayisə et"
        >
          <IconCompare width={18} height={18} />
        </button>
      )}
      {favoriteButton ?? (
        <button
          type="button"
          className="ui-product-card__icon-btn"
          aria-label={`${productName} — sevimlilərə əlavə et`}
          title="Sevimlilərə əlavə et"
        >
          <IconHeart width={18} height={18} />
        </button>
      )}
    </div>
  );
}
