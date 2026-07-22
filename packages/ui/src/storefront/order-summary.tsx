import type { ReactNode } from "react";

import { Card } from "../primitives/card";
import { Price } from "../primitives/price";
import { formatAzn, parseAznAmount } from "../utils/format-azn";

type OrderSummaryProps = {
  subtotal: string;
  itemCount?: number;
  discountTotal?: string;
  deliveryFee?: string | null;
  totalLabel?: string;
  cartLines?: ReactNode;
  children?: ReactNode;
};

export function OrderSummary({
  subtotal,
  itemCount,
  discountTotal = "0.00",
  deliveryFee,
  totalLabel = "Cəmi",
  cartLines,
  children,
}: OrderSummaryProps) {
  const subtotalValue = parseAznAmount(subtotal) ?? 0;
  const discountValue = parseAznAmount(discountTotal) ?? 0;
  const deliveryValue =
    deliveryFee === null || deliveryFee === undefined
      ? 0
      : parseAznAmount(deliveryFee) ?? 0;
  const grandTotal = subtotalValue + deliveryValue;

  return (
    <Card className="ui-order-summary">
      <h2>Sifariş xülasəsi</h2>
      {cartLines ? <div className="ui-order-summary__items">{cartLines}</div> : null}
      <div className="ui-order-summary__row">
        <span>Məhsullar:</span>
        <span className="ui-order-summary__item-count">
          {itemCount !== undefined ? itemCount : "—"}
        </span>
      </div>
      <div className="ui-order-summary__row">
        <span>Ümumi məbləğ:</span>
        <Price value={formatAzn(subtotalValue)} />
      </div>
      {discountValue > 0 ? (
        <div className="ui-order-summary__row">
          <span>Ümumi endirim:</span>
          <Price value={formatAzn(discountValue)} />
        </div>
      ) : null}
      {deliveryFee !== undefined && deliveryValue > 0 ? (
        <div className="ui-order-summary__row">
          <span>Çatdırılma</span>
          <Price value={formatAzn(deliveryValue)} />
        </div>
      ) : null}
      <div className="ui-order-summary__total">
        <span>{totalLabel}</span>
        <Price value={formatAzn(grandTotal)} />
      </div>
      {children}
    </Card>
  );
}
