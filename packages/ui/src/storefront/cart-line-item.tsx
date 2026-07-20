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
  lineTotal: string;
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
  lineTotal,
  linePreviousTotal,
  available,
  image,
  variant = "default",
  onQuantityChange,
  onRemove,
}: CartLineItemProps) {
  const { requestConfirm, confirmDialog } = useConfirmDialog();
  const imageUrl = getProductImageUrl(image);
  const formattedLineTotal = formatAznValue(lineTotal) ?? "—";
  const formattedLinePreviousTotal =
    linePreviousTotal === null || linePreviousTotal === undefined
      ? null
      : formatAznValue(linePreviousTotal);
  const hasSale =
    formattedLinePreviousTotal !== null &&
    Number(linePreviousTotal) > Number(lineTotal);
  const isSummary = variant === "summary";
  const pricing = (
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
        {available <= 0 ? (
          <p className="ui-cart-line__stock ui-cart-line__stock--muted">
            Hazırda mövcud deyil
          </p>
        ) : available <= 3 ? (
          <p className="ui-cart-line__stock ui-cart-line__stock--warning">
            Son {available} ədəd
          </p>
        ) : null}
        {isSummary ? pricing : null}
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
