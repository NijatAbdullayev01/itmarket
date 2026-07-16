import Link from "next/link";

import { completeMockPaymentAction } from "@/app/actions";
import { formatAznValue } from "@/lib/format-azn";
import { Button } from "@itmarket/ui";

export const metadata = {
  title: "Ödəniş səhifəsi",
};

export default async function MockProviderPage({
  searchParams,
}: {
  searchParams: Promise<{
    attemptToken?: string;
    orderNumber?: string;
    paymentMethod?: string;
    installmentMonths?: string;
    amount?: string;
  }>;
}) {
  const {
    attemptToken,
    orderNumber,
    paymentMethod,
    installmentMonths,
    amount,
  } = await searchParams;

  if (attemptToken === undefined || orderNumber === undefined) {
    return (
      <div className="ui-container">
        <h1 className="ui-page-title">Ödəniş sessiyası tapılmadı</h1>
        <Link className="ui-btn ui-btn--primary" href="/">
          Kataloqa qayıt
        </Link>
      </div>
    );
  }

  return (
    <div className="ui-container">
      <div className="ui-status-panel" style={{ maxWidth: 520 }}>
        <p className="ui-section-kicker">Online ödəniş</p>
        <h1 className="ui-page-title">Kart ödənişi</h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          Sifariş <strong>{orderNumber}</strong> üçün{" "}
          {formatAznValue(amount) ?? "məbləğ"} ödənişini tamamlayın.
        </p>
        <p style={{ color: "var(--color-text-muted)" }}>
          Növ:{" "}
          <strong>
            {paymentMethod === "INSTALLMENT" ? "Taksit" : "Bank kartı"}
          </strong>
          {paymentMethod === "INSTALLMENT" && installmentMonths
            ? ` · ${installmentMonths} ay`
            : ""}
        </p>
        <form className="ui-card ui-checkout-panel" action={completeMockPaymentAction}>
          <input type="hidden" name="attemptToken" value={attemptToken} />
          <input type="hidden" name="orderNumber" value={orderNumber} />
          <Button name="scenario" value="success" type="submit">
            Uğurlu ödəniş
          </Button>
          <Button name="scenario" value="failure" type="submit" variant="secondary">
            Uğursuz ödəniş
          </Button>
          <Button name="scenario" value="cancel" type="submit" variant="ghost">
            Ləğv et
          </Button>
        </form>
        <Link
          className="ui-btn ui-btn--secondary"
          href={`/checkout/status?orderNumber=${encodeURIComponent(orderNumber)}`}
        >
          Cari statusu yoxla
        </Link>
      </div>
    </div>
  );
}
