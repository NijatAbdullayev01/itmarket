import Link from "next/link";

import { completeMockPaymentAction } from "@/app/actions";
import { formatAzn } from "@/lib/format-azn";

export const metadata = {
  title: "Mock payment provider",
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
      <main className="shell detail-page success-page">
        <p className="section-kicker">Mock provider</p>
        <h1>Payment sessiyası tapılmadı</h1>
        <Link className="button-link" href="/">
          Kataloqa qayıt
        </Link>
      </main>
    );
  }

  return (
    <main className="shell detail-page success-page">
      <p className="section-kicker">Sandbox provider</p>
      <h1>Mock hosted checkout</h1>
      <p className="hero-copy">
        Sifariş <strong>{orderNumber}</strong> üçün{" "}
        {amount ? formatAzn(Number(amount)) : "məbləğ"} ödəniş ssenarisini
        seçin.
      </p>
      <p>
        Növ:{" "}
        <strong>
          {paymentMethod === "INSTALLMENT" ? "Taksit" : "Adi kart"}
        </strong>
        {paymentMethod === "INSTALLMENT" && installmentMonths
          ? ` · ${installmentMonths} ay`
          : ""}
      </p>
      <form className="checkout-form" action={completeMockPaymentAction}>
        <input type="hidden" name="attemptToken" value={attemptToken} />
        <input type="hidden" name="orderNumber" value={orderNumber} />
        <button name="scenario" value="success" type="submit">
          Uğurlu callback göndər
        </button>
        <button name="scenario" value="failure" type="submit">
          Uğursuz callback göndər
        </button>
        <button name="scenario" value="cancel" type="submit">
          Ləğv callback göndər
        </button>
        <button name="scenario" value="timeout" type="submit">
          Timeout vəziyyətində saxla
        </button>
      </form>
      <Link
        className="button-link"
        href={`/checkout/status?orderNumber=${encodeURIComponent(orderNumber)}`}
      >
        Cari statusu yoxla
      </Link>
    </main>
  );
}
