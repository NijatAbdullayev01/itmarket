"use client";

import { QuantityStepper } from "../primitives/quantity-stepper";
import { Price } from "../primitives/price";
import { useConfirmDialog } from "../primitives/use-confirm-dialog";
import { formatChromeMessage } from "./chrome-copy";
import { IconTrash } from "./icons";
import { formatAznValue } from "../utils/format-azn";
import {
  getProductImageUrl,
  type ProductMedia,
} from "../utils/product-image";
import {
  DefaultMediaImage,
  type MediaImageComponent,
} from "./media-image";

export type CartLineItemCopy = {
  remove: string;
  removeConfirm: string;
  removeConfirmTitle?: string;
  removeMessage: string;
  confirmLabel?: string;
  cancelLabel?: string;
  unavailable: string;
  lastN: string;
  pieceCount: string;
};

export const defaultCartLineItemCopy: CartLineItemCopy = {
  remove: "Sil",
  removeConfirm: "Səbətdən sil",
  removeConfirmTitle: "Səbətdən sil",
  removeMessage: "“{name}” məhsulunu səbətdən silmək istəyirsiniz?",
  confirmLabel: "Sil",
  cancelLabel: "Ləğv et",
  unavailable: "Hazırda mövcud deyil",
  lastN: "Son {n} ədəd",
  pieceCount: "{count} əd",
};

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
  copy?: Partial<CartLineItemCopy>;
  /** Optional app-level image renderer (e.g. next/image). */
  Image?: MediaImageComponent;
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
  copy: copyProp,
  Image: ImageComponent = DefaultMediaImage,
}: CartLineItemProps) {
  const copy = { ...defaultCartLineItemCopy, ...copyProp };
  const { requestConfirm, confirmDialog } = useConfirmDialog();
  const imageUrl = getProductImageUrl(image);
  const resolvedUnitPreviousPrice =
    unitPreviousPriceProp ??
    (linePreviousTotal !== null &&
    linePreviousTotal !== undefined &&
    quantity > 0
      ? (Number(linePreviousTotal) / quantity).toFixed(2)
      : null);
  const formattedUnitPrice = formatAznValue(unitPrice) ?? "\u2014";
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
          <ImageComponent
            src={imageUrl}
            alt={productName}
            loading="lazy"
            width={96}
            height={96}
            sizes="96px"
          />
        </div>
      )}
      <div className="ui-cart-line__info">
        <div className="ui-cart-line__heading">
          <h3>{productName}</h3>
          {isSummary ? null : (
            <div className="ui-cart-line__actions">
              <button
                className="ui-btn ui-btn--ghost ui-cart-line__remove"
                type="button"
                aria-label={copy.remove}
                title={copy.remove}
                onClick={() =>
                  requestConfirm({
                    title: copy.removeConfirmTitle ?? copy.removeConfirm,
                    message: formatChromeMessage(copy.removeMessage, { name: productName }),
                    confirmLabel: copy.confirmLabel,
                    cancelLabel: copy.cancelLabel,
                    onConfirm: async () => {
                      await onRemove();
                    },
                  })
                }
              >
                <IconTrash width={18} height={18} />
              </button>
            </div>
          )}
        </div>
        <p className="ui-cart-line__meta">
          {`${variantName} \u00B7 ${sku}`}
          {isSummary ? ` \u00B7 ${formatChromeMessage(copy.pieceCount, { count: quantity })}` : null}
        </p>
        {available <= 0 ? (
          <p className="ui-cart-line__stock ui-cart-line__stock--muted">
            {copy.unavailable}
          </p>
        ) : available <= 3 ? (
          <p className="ui-cart-line__stock ui-cart-line__stock--warning">
            {formatChromeMessage(copy.lastN, { n: available })}
          </p>
        ) : null}
        <div className="ui-cart-line__footer">
          {pricing}
          {isSummary ? null : (
            <QuantityStepper
              value={quantity}
              max={available > 0 ? available : undefined}
              disabled={available <= 0}
              onChange={onQuantityChange}
            />
          )}
        </div>
      </div>
      {confirmDialog}
    </article>
  );
}
