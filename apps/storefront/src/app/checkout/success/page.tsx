import Link from "next/link";
import { EmptyStateLink } from "@itmarket/ui";

export const metadata = {
  title: "Sifariş yaradıldı",
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string }>;
}) {
  const { orderNumber } = await searchParams;

  return (
    <div className="ui-container">
      <div className="ui-status-panel">
        <div className="ui-status-icon ui-status-icon--success" aria-hidden="true">
          ✓
        </div>
        <p className="ui-section-kicker">Sifariş qəbul edildi</p>
        <h1 className="ui-page-title">Sifarişiniz qəbul edildi</h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          Stok rezerv olundu. Sifariş nömrəniz:{" "}
          <strong>{orderNumber ?? "naməlum"}</strong>
        </p>
        <div className="ui-copy-row">
          <EmptyStateLink href="/" label="Kataloqa qayıt" />
          {orderNumber ? (
            <Link
              className="ui-btn ui-btn--secondary"
              href={`/checkout/status?orderNumber=${encodeURIComponent(orderNumber)}`}
            >
              Statusu yoxla
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
