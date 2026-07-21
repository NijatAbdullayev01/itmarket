"use client";

import { QuantityStepper } from "../primitives/quantity-stepper";
import { Price } from "../primitives/price";
import { useConfirmDialog } from "../primitives/use-confirm-dialog";
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
  unitPrice: string;
  unitPreviousPrice?: string | null;
  linePreviousTotal?: string | null;
  available: number;
  image?: ProductMedia | null;
  variant?: "default" | "summary";
  onQuantityChange: (quantity: number) => void | Promise<void>;
  onRemove: () => void | Promise<void>;
};

export function CartLineItem({
  productName,
  variantName,
  sku,
  quantity,
  unitPrice,
  unitPreviousPrice: unitPreviousPriceProp,
  linePreviousTotal,
  available,
  image,
  variant = "default",
  onQuantityChange,
  onRemove,
}: CartLineItemProps) {
  const { requestConfirm, confirmDialog } = useConfirmDialog();
  const imageUrl = getProductImageUrl(image);
  const resolvedUnitPreviousPrice =
    unitPreviousPriceProp ??
    (linePreviousTotal !== null &&
    linePreviousTotal !== undefined &&
    quantity > 0
      ? (Number(linePreviousTotal) / quantity).toFixed(2)
      : null);
  const formattedUnitPrice = formatAznValue(unitPrice) ?? "—";
  const formattedUnitPreviousPrice =
    resolvedUnitPreviousPrice === null
      ? null
      : formatAznValue(resolvedUnitPreviousPrice);
  const hasSale =
    formattedUnitPreviousPrice !== null &&
    Number(resolvedUnitPreviousPrice) > Number(unitPrice);
  const isSummary = variant === "summary";
  const pricing = (
    <div className="ui-cart-line__pricing">
      <Price
        className="ui-cart-line__price"
        value={formattedUnitPrice}
        variant={hasSale ? "sale" : "default"}
      />
      {hasSale && formattedUnitPreviousPrice !== null ? (
        <Price
          className="ui-cart-line__price-old"
          value={formattedUnitPreviousPrice}
          variant="previous"
        />
      ) : null}
    </div>
  );
  const stepper = (
    <QuantityStepper
      value={quantity}
      max={available > 0 ? available : undefined}
      disabled={available <= 0}
      onChange={onQuantityChange}
    />
  );
  const removeButton = (
    <button
      className="ui-btn ui-btn--ghost ui-cart-line__remove"
      type="button"
      aria-label="Sil"
      title="Sil"
      onClick={() =>
        requestConfirm({
          title: "Səbətdən sil",
          message: `"${productName}" məhsulunu səbətdən silmək istəyirsiniz?`,
          onConfirm: async () => {
            await onRemove();
          },
        })
      }
    >
      <IconTrash width={isSummary ? 18 : 20} height={isSummary ? 18 : 20} />
    </button>
  );

  return (
    <article
      className={
        isSummary
          ? "ui-cart-line ui-cart-line--summary"
          : "ui-card ui-cart-line"
      }
    >
      {isSummary ? null : (
        <div className="ui-cart-line__thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={productName} loading="lazy" />
        </div>
      )}
      <div className="ui-cart-line__info">
        <h3>{productName}</h3>
        <p className="ui-cart-line__meta">
          {variantName} · {sku}
          {isSummary ? ` · ${quantity} əd` : null}
        </p>
        {pricing}
        {available <= 0 ? (
          <p className="ui-cart-line__stock ui-cart-line__stock--muted">
            Hazırda mövcud deyil
          </p>
        ) : available <= 3 ? (
          <p className="ui-cart-line__stock ui-cart-line__stock--warning">
            Son {available} ədəd
          </p>
        ) : null}
      </div>
      {isSummary ? null : (
        <>
          {stepper}
          <div className="ui-cart-line__actions">{removeButton}</div>
        </>
      )}
      {confirmDialog}
    </article>
  );
}
