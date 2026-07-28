import { cookies } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";

import { continuePaymentAction } from "@/app/actions";
import { PaymentHandoffActions } from "@/components/payment-handoff-actions";
import { formatAznValue } from "@/lib/format-azn";
import { getPaymentAttemptHandoff } from "@/lib/api";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { getMessages, formatMessage } from "@/lib/i18n";
import { noIndexRobots } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  return {
    title: messages.checkout.payTitle,
    robots: noIndexRobots,
  };
}

const ATTEMPT_TOKEN_COOKIE = "itmarket_payment_attempt_token";

export default async function CheckoutPayPage() {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const cookieStore = await cookies();
  const attemptToken = cookieStore.get(ATTEMPT_TOKEN_COOKIE)?.value;

  if (attemptToken === undefined) {
    return (
      <div className="ui-container">
        <div className="ui-status-panel">
          <div
            className="ui-status-icon ui-status-icon--error"
            aria-hidden="true"
          >
            !
          </div>
          <p className="ui-section-kicker">{messages.checkout.onlinePayment}</p>
          <h1 className="ui-page-title">{messages.checkout.paySessionNotFound}</h1>
          <p className="ui-payment-mock__lead">
            {messages.checkout.paySessionExpired}
          </p>
          <Link className="ui-btn ui-btn--primary ui-btn--block" href="/">
            {messages.checkout.backToCatalog}
          </Link>
        </div>
      </div>
    );
  }

  let handoff: Awaited<ReturnType<typeof getPaymentAttemptHandoff>>;
  try {
    handoff = await getPaymentAttemptHandoff(attemptToken);
  } catch {
    return (
      <div className="ui-container">
        <div className="ui-status-panel">
          <div
            className="ui-status-icon ui-status-icon--error"
            aria-hidden="true"
          >
            !
          </div>
          <p className="ui-section-kicker">{messages.checkout.onlinePayment}</p>
          <h1 className="ui-page-title">{messages.checkout.paySessionNotFound}</h1>
          <p className="ui-payment-mock__lead">
            {messages.checkout.paySessionExpired}
          </p>
          <Link className="ui-btn ui-btn--primary ui-btn--block" href="/">
            {messages.checkout.backToCatalog}
          </Link>
        </div>
      </div>
    );
  }

  const { orderNumber, paymentMethod, installmentMonths, amount } = handoff;
  const isInstallment = paymentMethod === "INSTALLMENT";
  const methodLabel = isInstallment
    ? messages.checkout.installmentCard
    : messages.checkout.cardPayment;
  const formattedAmount = formatAznValue(amount);

  return (
    <div className="ui-container ui-payment-mock">
      <div className="ui-status-panel ui-payment-mock__panel">
        <div className="ui-status-icon ui-payment-mock__icon" aria-hidden="true">
          ₼
        </div>
        <h1 className="ui-page-title">{messages.checkout.payTitle}</h1>
        <p className="ui-payment-mock__lead">
          {messages.checkout.payLead}
        </p>

        <div className="ui-payment-mock__amount" aria-label={messages.checkout.paymentAmountLabel}>
          <span className="ui-payment-mock__amount-label">{messages.checkout.paymentAmount}</span>
          <strong className="ui-payment-mock__amount-value">
            {formattedAmount ?? "—"}
          </strong>
        </div>

        <dl className="ui-status-dl">
          <div className="ui-status-dl__row">
            <dt>{messages.checkout.orderNumberLabel}</dt>
            <dd>{orderNumber}</dd>
          </div>
          <div className="ui-status-dl__row">
            <dt>{messages.checkout.paymentType}</dt>
            <dd>{methodLabel}</dd>
          </div>
          {isInstallment && installmentMonths !== null ? (
            <div className="ui-status-dl__row">
              <dt>{messages.checkout.paymentTerm}</dt>
              <dd>
                {formatMessage(messages.common.months, {
                  count: String(installmentMonths),
                })}
              </dd>
            </div>
          ) : null}
        </dl>

        <PaymentHandoffActions
          action={continuePaymentAction}
          orderNumber={orderNumber}
        />
      </div>
    </div>
  );
}
