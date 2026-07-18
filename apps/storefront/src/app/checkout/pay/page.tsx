import Link from "next/link";

import { continuePaymentAction } from "@/app/actions";
import { PaymentHandoffActions } from "@/components/payment-handoff-actions";
import { formatAznValue } from "@/lib/format-azn";

export const metadata = {
  title: "Ödəniş səhifəsi",
};

const INSTALLMENT_PROVIDER_LABELS: Record<string, string> = {
  birbank: "Birbank",
  tamkart: "Tam Kart",
  leobank: "Leobank",
};

export default async function CheckoutPayPage({
  searchParams,
}: {
  searchParams: Promise<{
    attemptToken?: string;
    orderNumber?: string;
    paymentMethod?: string;
    installmentMonths?: string;
    installmentProvider?: string;
    amount?: string;
  }>;
}) {
  const {
    attemptToken,
    orderNumber,
    paymentMethod,
    installmentMonths,
    installmentProvider,
    amount,
  } = await searchParams;

  if (attemptToken === undefined || orderNumber === undefined) {
    return (
      <div className="ui-container">
        <div className="ui-status-panel">
          <div
            className="ui-status-icon ui-status-icon--error"
            aria-hidden="true"
          >
            !
          </div>
          <p className="ui-section-kicker">Online ödəniş</p>
          <h1 className="ui-page-title">Ödəniş sessiyası tapılmadı</h1>
          <p className="ui-payment-mock__lead">
            Sessiya bitib və ya keçid etibarsızdır. Kataloqdan yenidən cəhd edin.
          </p>
          <Link className="ui-btn ui-btn--primary ui-btn--block" href="/">
            Kataloqa qayıt
          </Link>
        </div>
      </div>
    );
  }

  const isInstallment = paymentMethod === "INSTALLMENT";
  const methodLabel = isInstallment ? "Taksit kartı" : "Kartla ödə";
  const providerLabel =
    installmentProvider !== undefined
      ? (INSTALLMENT_PROVIDER_LABELS[installmentProvider] ?? null)
      : null;
  const formattedAmount = formatAznValue(amount);

  return (
    <div className="ui-container ui-payment-mock">
      <div className="ui-status-panel ui-payment-mock__panel">
        <div className="ui-status-icon ui-payment-mock__icon" aria-hidden="true">
          ₼
        </div>
        <h1 className="ui-page-title">Kart ödənişi</h1>
        <p className="ui-payment-mock__lead">
          Sifariş üçün ödənişi təsdiqləyin. Ödənişə keç düyməsi sizi ödəniş
          provayderinə yönləndirəcək.
        </p>

        <div className="ui-payment-mock__amount" aria-label="Ödəniş məbləği">
          <span className="ui-payment-mock__amount-label">Ödəniləcək məbləğ</span>
          <strong className="ui-payment-mock__amount-value">
            {formattedAmount ?? "—"}
          </strong>
        </div>

        <dl className="ui-status-dl">
          <div className="ui-status-dl__row">
            <dt>Sifariş nömrəsi:</dt>
            <dd>{orderNumber}</dd>
          </div>
          <div className="ui-status-dl__row">
            <dt>Növ:</dt>
            <dd>{methodLabel}</dd>
          </div>
          {isInstallment && providerLabel ? (
            <div className="ui-status-dl__row">
              <dt>Bank:</dt>
              <dd>{providerLabel}</dd>
            </div>
          ) : null}
          {isInstallment && installmentMonths ? (
            <div className="ui-status-dl__row">
              <dt>Müddət:</dt>
              <dd>{installmentMonths} ay</dd>
            </div>
          ) : null}
        </dl>

        <PaymentHandoffActions
          action={continuePaymentAction}
          attemptToken={attemptToken}
          orderNumber={orderNumber}
        />
      </div>
    </div>
  );
}
