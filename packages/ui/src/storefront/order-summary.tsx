import type { ReactNode } from "react";

import { Card } from "../primitives/card";
import { Price } from "../primitives/price";
import { formatAzn } from "../utils/format-azn";

type OrderSummaryProps = {
  subtotal: string;
  deliveryFee?: string | null;
  totalLabel?: string;
  children?: ReactNode;
};

export function OrderSummary({
  subtotal,
  deliveryFee,
  totalLabel = "Cəmi",
  children,
}: OrderSummaryProps) {
  const subtotalValue = Number(subtotal);
  const deliveryValue =
    deliveryFee === null || deliveryFee === undefined ? 0 : Number(deliveryFee);
  const grandTotal = subtotalValue + deliveryValue;

  return (
    <Card className="ui-order-summary">
      <h2>Sifariş xülasəsi</h2>
      <div className="ui-order-summary__row">
        <span>Məhsullar</span>
        <Price value={formatAzn(subtotalValue)} />
      </div>
      {deliveryFee !== undefined ? (
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
