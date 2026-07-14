import Link from "next/link";

import { getOrderStatus } from "@/lib/api";
import {
  EmptyStateLink,
  fulfillmentStatusLabels,
  labelFor,
  orderStatusLabels,
  paymentStatusLabels,
} from "@itmarket/ui";

export const metadata = {
  title: "Ödəniş statusu",
};

function statusIcon(paymentStatus: string) {
  if (paymentStatus === "PAID" || paymentStatus === "AUTHORIZED") {
    return "ui-status-icon--success";
  }
  if (paymentStatus === "FAILED" || paymentStatus === "CANCELLED") {
    return "ui-status-icon--error";
  }
  return "ui-status-icon--pending";
}

export default async function CheckoutStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string }>;
}) {
  const { orderNumber } = await searchParams;

  if (orderNumber === undefined) {
    return (
      <div className="ui-container">
        <div className="ui-status-panel">
          <h1 className="ui-page-title">Sifariş nömrəsi verilməyib</h1>
          <EmptyStateLink href="/" label="Kataloqa qayıt" />
        </div>
      </div>
    );
  }

  const status = await getOrderStatus(orderNumber);
  const paymentLabel = labelFor(paymentStatusLabels, status.paymentStatus);
  const orderLabel = labelFor(orderStatusLabels, status.orderStatus);
  const fulfillmentLabel = labelFor(
    fulfillmentStatusLabels,
    status.fulfillmentStatus,
  );

  return (
    <div className="ui-container">
      <div className="ui-status-panel">
        <div
          className={`ui-status-icon ${statusIcon(status.paymentStatus)}`}
          aria-hidden="true"
        >
          {status.paymentStatus === "FAILED" ? "!" : "✓"}
        </div>
        <p className="ui-section-kicker">Sifariş statusu</p>
        <h1 className="ui-page-title">{paymentLabel}</h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          Sifariş nömrəsi: <strong>{status.orderNumber}</strong>
        </p>
        <dl className="ui-status-dl">
          <div className="ui-status-dl__row">
            <dt>Sifariş</dt>
            <dd>{orderLabel}</dd>
          </div>
          <div className="ui-status-dl__row">
            <dt>Ödəniş</dt>
            <dd>{paymentLabel}</dd>
          </div>
          <div className="ui-status-dl__row">
            <dt>Təhvil</dt>
            <dd>{fulfillmentLabel}</dd>
          </div>
        </dl>
        <div className="ui-copy-row">
          <EmptyStateLink href="/" label="Kataloqa qayıt" />
          {status.paymentStatus === "FAILED" ? (
            <Link className="ui-btn ui-btn--primary" href="/cart">
              Yenidən cəhd et
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
