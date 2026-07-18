import { EmptyStateLink } from "@itmarket/ui";

export const metadata = {
  title: "Sifariş yaradıldı",
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string; review?: string }>;
}) {
  const { orderNumber, review } = await searchParams;
  const isUnderReview = review === "1";

  return (
    <div className="ui-container">
      <div className="ui-status-panel">
        <div
          className={
            isUnderReview
              ? "ui-status-icon ui-status-icon--pending"
              : "ui-status-icon ui-status-icon--success"
          }
          aria-hidden="true"
        >
          {isUnderReview ? "…" : "✓"}
        </div>
        <h1 className="ui-page-title">Sifarişiniz qəbul edildi</h1>
        {isUnderReview ? (
          <p style={{ color: "var(--color-text-muted)" }}>
            Sifarişiniz <strong>Baxılır</strong> statusundadır. Hissə-hissə al
            müraciətiniz yoxlanıldıqdan sonra sizinlə əlaqə saxlanılacaq.
          </p>
        ) : null}
        <p style={{ color: "var(--color-text-muted)" }}>
          Sifariş nömrəniz:{" "}
          <strong>{orderNumber ?? "naməlum"}</strong>
        </p>
        <div className="ui-copy-row">
          <EmptyStateLink href="/" label="Məhsullara bax" />
        </div>
      </div>
    </div>
  );
}
