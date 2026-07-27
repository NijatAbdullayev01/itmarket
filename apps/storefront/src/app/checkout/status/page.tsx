import type { Metadata } from "next";
import { CheckoutStatusPanel } from "@/components/checkout-status-panel";
import { ApiError, getOrderStatus } from "@/lib/api";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { getMessages } from "@/lib/i18n";
import { noIndexRobots } from "@/lib/seo";
import { EmptyStateLink } from "@itmarket/ui";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  return {
    title: messages.checkout.orderStatusLabel,
    robots: noIndexRobots,
  };
}

export default async function CheckoutStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string; statusToken?: string }>;
}) {
  const [{ orderNumber, statusToken }, locale] = await Promise.all([
    searchParams,
    getRequestLocale(),
  ]);
  const messages = getMessages(locale);

  if (
    orderNumber === undefined ||
    orderNumber.trim() === "" ||
    statusToken === undefined ||
    statusToken.trim() === ""
  ) {
    return (
      <div className="ui-container">
        <div className="ui-status-panel">
          <h1 className="ui-page-title">{messages.checkout.statusMissingTitle}</h1>
          <EmptyStateLink href="/" label={messages.common.viewProducts} />
        </div>
      </div>
    );
  }

  try {
    const status = await getOrderStatus(orderNumber, statusToken);
    return (
      <div className="ui-container">
        <CheckoutStatusPanel initial={status} statusToken={statusToken} />
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      return (
        <div className="ui-container">
          <div className="ui-status-panel">
            <h1 className="ui-page-title">
              {messages.checkout.statusNotFoundTitle}
            </h1>
            <p style={{ color: "var(--color-text-muted)" }}>
              {messages.checkout.statusNotFoundDescription}
            </p>
            <EmptyStateLink href="/" label={messages.common.viewProducts} />
          </div>
        </div>
      );
    }
    throw error;
  }
}
