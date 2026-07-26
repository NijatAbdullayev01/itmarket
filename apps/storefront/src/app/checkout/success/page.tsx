import type { Metadata } from "next";
import { EmptyStateLink } from "@itmarket/ui";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { getMessages } from "@/lib/i18n";
import { noIndexRobots } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  return {
    title: messages.checkout.successTitle,
    robots: noIndexRobots,
  };
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string; review?: string }>;
}) {
  const [{ orderNumber, review }, locale] = await Promise.all([
    searchParams,
    getRequestLocale(),
  ]);
  const messages = getMessages(locale);
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
        <h1 className="ui-page-title">{messages.checkout.successHeading}</h1>
        {isUnderReview ? (
          <p style={{ color: "var(--color-text-muted)" }}>
            {messages.checkout.successReviewBody}
          </p>
        ) : null}
        <p style={{ color: "var(--color-text-muted)" }}>
          {messages.checkout.successPartialBody}{" "}
          <strong>{orderNumber ?? "—"}</strong>
        </p>
        <div className="ui-copy-row">
          <EmptyStateLink href="/" label={messages.common.viewProducts} />
        </div>
      </div>
    </div>
  );
}
