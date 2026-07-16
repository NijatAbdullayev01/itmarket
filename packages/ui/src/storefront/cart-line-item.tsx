"use client";

import { QuantityStepper } from "../primitives/quantity-stepper";
import { Price } from "../primitives/price";
import { IconTrash } from "./icons";
import { formatAznValue } from "../utils/format-azn";
import {
  getProductImageUrl,
  type ProductMedia,
} from "../utils/product-image";

type CartLineItemProps = {
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  lineTotal: string;
  linePreviousTotal?: string | null;
  available: number;
  image?: ProductMedia | null;
  onQuantityChange: (quantity: number) => void | Promise<void>;
  onRemove: () => void | Promise<void>;
};

export function CartLineItem({
  productName,
  variantName,
  sku,
  quantity,
  lineTotal,
  linePreviousTotal,
  available,
  image,
  onQuantityChange,
  onRemove,
}: CartLineItemProps) {
  const imageUrl = getProductImageUrl(image);
  const formattedLineTotal = formatAznValue(lineTotal) ?? "—";
  const formattedLinePreviousTotal =
    linePreviousTotal === null || linePreviousTotal === undefined
      ? null
      : formatAznValue(linePreviousTotal);
  const hasSale =
    formattedLinePreviousTotal !== null &&
    Number(linePreviousTotal) > Number(lineTotal);

  return (
    <article className="ui-card ui-cart-line">
      <div className="ui-cart-line__thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={productName} loading="lazy" />
      </div>
      <div className="ui-cart-line__info">
        <h3>{productName}</h3>
        <p className="ui-cart-line__meta">
          {variantName} · {sku}
        </p>
        {available <= 0 ? (
          <p className="ui-cart-line__stock ui-cart-line__stock--muted">
            Hazırda mövcud deyil
          </p>
        ) : available <= 3 ? (
          <p className="ui-cart-line__stock ui-cart-line__stock--warning">
            Son {available} ədəd
          </p>
        ) : null}
        <div className="ui-cart-line__pricing">
          <Price
            className="ui-cart-line__price"
            value={formattedLineTotal}
            variant={hasSale ? "sale" : "default"}
          />
          {hasSale && formattedLinePreviousTotal !== null ? (
            <Price
              className="ui-cart-line__price-old"
              value={formattedLinePreviousTotal}
              variant="previous"
            />
          ) : null}
        </div>
      </div>
      <QuantityStepper
        value={quantity}
        max={available > 0 ? available : undefined}
        disabled={available <= 0}
        onChange={onQuantityChange}
      />
      <div className="ui-cart-line__actions">
        <button
          className="ui-btn ui-btn--ghost ui-cart-line__remove"
          type="button"
          aria-label="Sil"
          title="Sil"
          onClick={() => void onRemove()}
        >
          <IconTrash width={20} height={20} />
        </button>
      </div>
    </article>
  );
}
