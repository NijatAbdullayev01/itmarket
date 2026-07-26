import type { ReactNode } from "react";

import { Card } from "../primitives/card";
import { Price } from "../primitives/price";
import { formatAzn, parseAznAmount } from "../utils/format-azn";

export type OrderSummaryCopy = {
  heading: string;
  itemCount: string;
  subtotal: string;
  discount: string;
  delivery: string;
  total: string;
};

export const defaultOrderSummaryCopy: OrderSummaryCopy = {
  heading: "Sifari\u015F x\u00FClas\u0259si",
  itemCount: "M\u0259hsul say\u0131",
  subtotal: "\u00DCmumi m\u0259bl\u0259\u011F",
  discount: "\u00DCmumi endirim",
  delivery: "\u00C7atd\u0131r\u0131lma",
  total: "C\u0259mi",
};

type OrderSummaryProps = {
  subtotal: string;
  itemCount?: number;
  discountTotal?: string;
  deliveryFee?: string | null;
  totalLabel?: string;
  cartLines?: ReactNode;
  children?: ReactNode;
  copy?: Partial<OrderSummaryCopy>;
};

export function OrderSummary({
  subtotal,
  itemCount,
  discountTotal = "0.00",
  deliveryFee,
  totalLabel,
  cartLines,
  children,
  copy: copyProp,
}: OrderSummaryProps) {
  const copy = { ...defaultOrderSummaryCopy, ...copyProp };
  const resolvedTotalLabel = copy.total !== defaultOrderSummaryCopy.total
    ? copy.total
    : totalLabel ?? copy.total;
  const subtotalValue = parseAznAmount(subtotal) ?? 0;
  const discountValue = parseAznAmount(discountTotal) ?? 0;
  const deliveryValue =
    deliveryFee === null || deliveryFee === undefined
      ? 0
      : parseAznAmount(deliveryFee) ?? 0;
  const grandTotal = subtotalValue + deliveryValue;

  return (
    <Card className="ui-order-summary">
      <div className="ui-order-summary__heading">
        <h2>{copy.heading}</h2>
      </div>
      {cartLines ? (
        <div className="ui-order-summary__items">{cartLines}</div>
      ) : null}
      <div className="ui-order-summary__breakdown">
        {itemCount !== undefined ? (
          <div className="ui-order-summary__row">
            <span>{copy.itemCount}</span>
            <span className="ui-order-summary__item-count">{itemCount}</span>
          </div>
        ) : null}
        <div className="ui-order-summary__row">
          <span>{copy.subtotal}</span>
          <Price value={formatAzn(subtotalValue)} />
        </div>
        {discountValue > 0 ? (
          <div className="ui-order-summary__row ui-order-summary__row--discount">
            <span>{copy.discount}</span>
            <Price value={formatAzn(discountValue)} />
          </div>
        ) : null}
        {deliveryFee !== undefined && deliveryValue > 0 ? (
          <div className="ui-order-summary__row">
            <span>{copy.delivery}</span>
            <Price value={formatAzn(deliveryValue)} />
          </div>
        ) : null}
      </div>
      <div className="ui-order-summary__total">
        <span>{resolvedTotalLabel}</span>
        <Price value={formatAzn(grandTotal)} />
      </div>
      {children}
    </Card>
  );
}
