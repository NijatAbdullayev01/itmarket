import Link from "next/link";

import { getOrderStatus } from "@/lib/api";

const paymentStatusLabels: Record<string, string> = {
  PENDING: "Ödəniş gözlənir",
  AUTHORIZED: "Ödəniş authorize olunub",
  PAID: "Ödəniş təsdiqlənib",
  FAILED: "Ödəniş uğursuz oldu",
  CANCELLED: "Ödəniş ləğv edildi",
  PARTIALLY_REFUNDED: "Qismən refund edildi",
  REFUNDED: "Tam refund edildi",
};

export const metadata = {
  title: "Ödəniş statusu",
};

export default async function CheckoutStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string }>;
}) {
  const { orderNumber } = await searchParams;

  if (orderNumber === undefined) {
    return (
      <main className="shell detail-page success-page">
        <p className="section-kicker">Checkout statusu</p>
        <h1>Sifariş nömrəsi verilməyib</h1>
        <Link className="button-link" href="/">
          Kataloqa qayıt
        </Link>
      </main>
    );
  }

  const status = await getOrderStatus(orderNumber);

  return (
    <main className="shell detail-page success-page">
      <p className="section-kicker">Checkout statusu</p>
      <h1>
        {paymentStatusLabels[status.paymentStatus] ?? status.paymentStatus}
      </h1>
      <p className="hero-copy">
        Sifariş nömrəsi: <strong>{status.orderNumber}</strong>
      </p>
      <dl className="signal-list" aria-label="Sifariş vəziyyəti">
        <div>
          <dt>Order</dt>
          <dd>{status.orderStatus}</dd>
        </div>
        <div>
          <dt>Payment</dt>
          <dd>{status.paymentStatus}</dd>
        </div>
        <div>
          <dt>Fulfillment</dt>
          <dd>{status.fulfillmentStatus}</dd>
        </div>
      </dl>
      <p>
        Provider: <strong>{status.provider ?? "yoxdur"}</strong>
        {status.sandbox ? " · sandbox" : ""}
      </p>
      <Link className="button-link" href="/">
        Kataloqa qayıt
      </Link>
    </main>
  );
}
