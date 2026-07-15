"use client";

import type { ReactNode } from "react";

type ProductCardActionsProps = {
  addToCartSlot: ReactNode;
};

export function ProductCardActions({ addToCartSlot }: ProductCardActionsProps) {
  return <div className="ui-product-card__actions">{addToCartSlot}</div>;
}

export function ProductCardOverlayActions({ productName }: { productName: string }) {
  return (
    <div className="ui-product-card__quick-actions">
      <button
        type="button"
        className="ui-icon-btn"
        aria-label={`${productName} — sevimlilərə əlavə et`}
        title="Sevimlilərə əlavə et"
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
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
        </svg>
      </button>
      <button
        type="button"
        className="ui-icon-btn"
        aria-label={`${productName} — müqayisə et`}
        title="Müqayisə et"
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
          <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" />
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <path d="M12 7v10" />
          <path d="M8 12h8" />
        </svg>
      </button>
    </div>
  );
}
