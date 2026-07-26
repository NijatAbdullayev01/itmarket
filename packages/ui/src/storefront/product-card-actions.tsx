"use client";

import type { ReactNode } from "react";

import { IconCompare, IconHeart } from "./icons";

type ProductCardActionsProps = {
  addToCartSlot: ReactNode;
};

export function ProductCardActions({ addToCartSlot }: ProductCardActionsProps) {
  return <div className="ui-product-card__actions">{addToCartSlot}</div>;
}

export type ProductCardOverlayActionsCopy = {
  compareTitle: string;
  compareAria: string;
  favoriteTitle: string;
  favoriteAria: string;
};

type ProductCardOverlayActionsProps = {
  productName: string;
  compareButton?: ReactNode;
  favoriteButton?: ReactNode;
  copy?: Partial<ProductCardOverlayActionsCopy>;
};

const defaultOverlayActionsCopy: ProductCardOverlayActionsCopy = {
  compareTitle: "M\u00FCqayis\u0259 et",
  compareAria: "{name} \u2014 m\u00FCqayis\u0259y\u0259 \u0259lav\u0259 et",
  favoriteTitle: "Sevimli\u0259r\u0259 \u0259lav\u0259 et",
  favoriteAria: "{name} \u2014 sevimli\u0259r\u0259 \u0259lav\u0259 et",
};

export function ProductCardOverlayActions({
  productName,
  compareButton,
  favoriteButton,
  copy: copyProp,
}: ProductCardOverlayActionsProps) {
  const copy = { ...defaultOverlayActionsCopy, ...copyProp };
  return (
    <div className="ui-product-card__quick-actions">
      {compareButton ?? (
        <button
          type="button"
          className="ui-product-card__icon-btn"
          aria-label={copy.compareAria.replace("{name}", productName)}
          title={copy.compareTitle}
        >
          <IconCompare width={18} height={18} />
        </button>
      )}
      {favoriteButton ?? (
        <button
          type="button"
          className="ui-product-card__icon-btn"
          aria-label={copy.favoriteAria.replace("{name}", productName)}
          title={copy.favoriteTitle}
        >
          <IconHeart width={18} height={18} />
        </button>
      )}
    </div>
  );
}
