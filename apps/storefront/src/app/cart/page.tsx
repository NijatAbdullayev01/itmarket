import Link from "next/link";
import { checkoutCash, checkoutOnline } from "@/app/actions";
import { getCart, getFulfillmentOptions, getPaymentOptions } from "@/lib/api";
import { formatAzn } from "@/lib/format-azn";

export const metadata = {
  title: "Səbət və checkout",
  description: "IT Market səbəti, delivery/pickup və nağd ödəniş checkout-u.",
};

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ cartId?: string }>;
}) {
  const { cartId } = await searchParams;
  if (cartId === undefined) {
    return (
      <main className="shell detail-page">
        <h1>Səbət boşdur</h1>
        <p className="hero-copy">Məhsul seçmək üçün kataloqa qayıdın.</p>
        <Link className="button-link" href="/">
          Kataloqa qayıt
        </Link>
      </main>
    );
  }

  const [cart, fulfillment, paymentOptions] = await Promise.all([
    getCart(cartId),
    getFulfillmentOptions(cartId),
    getPaymentOptions(cartId),
  ]);
  const firstZone = fulfillment.deliveryZones[0];
  const firstPickup = fulfillment.pickupLocations[0];
  const cardOption = paymentOptions.methods.find(
    (method) => method.method === "CARD",
  );
  const installmentOption = paymentOptions.methods.find(
    (method) => method.method === "INSTALLMENT",
  );

  return (
    <main className="shell detail-page">
      <Link href="/" className="back-link">
        Alışa davam et
      </Link>
      <section className="checkout-layout">
        <div>
          <p className="section-kicker">Səbət</p>
          <h1>Sifarişi tamamla</h1>
          {cart.items.length === 0 ? (
            <p className="empty-state">Səbətdə məhsul yoxdur.</p>
          ) : (
            <div className="cart-lines">
              {cart.items.map((item) => (
                <article key={item.id}>
                  <div>
                    <h3>{item.productName}</h3>
                    <p>
                      {item.variantName} · {item.sku}
                    </p>
                  </div>
                  <span>
                    {item.quantity} × {formatAzn(Number(item.unitPrice))}
                  </span>
                  <strong>{formatAzn(Number(item.lineTotal))}</strong>
                </article>
              ))}
            </div>
          )}
          <p className="cart-total">
            Məhsulların cəmi:{" "}
            <strong>{formatAzn(Number(cart.subtotal))}</strong>
          </p>
        </div>

        <form className="checkout-form">
          <input type="hidden" name="cartId" value={cart.id} />
          <h2>Çatdırılma və ödəniş</h2>
          <label htmlFor="recipientName">Ad və soyad</label>
          <input id="recipientName" name="recipientName" required />
          <label htmlFor="phone">Telefon</label>
          <input id="phone" name="phone" required placeholder="+994..." />
          <label htmlFor="email">E-poçt</label>
          <input id="email" name="email" type="email" />
          <label htmlFor="fulfillmentType">Təhvil alma növü</label>
          <select
            id="fulfillmentType"
            name="fulfillmentType"
            defaultValue="DELIVERY"
          >
            <option disabled={firstZone === undefined} value="DELIVERY">
              Ünvana çatdırılma
            </option>
            <option disabled={firstPickup === undefined} value="PICKUP">
              Mağazadan götürmə
            </option>
          </select>
          <label htmlFor="deliveryZoneId">Çatdırılma zonası</label>
          <select
            id="deliveryZoneId"
            name="deliveryZoneId"
            defaultValue={firstZone?.id}
          >
            <option value="">Seçilməyib</option>
            {fulfillment.deliveryZones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name} · {formatAzn(Number(zone.fee))} ·{" "}
                {zone.estimatedMinDays}-{zone.estimatedMaxDays} gün
              </option>
            ))}
          </select>
          <label htmlFor="pickupLocationId">Pickup məntəqəsi</label>
          <select
            id="pickupLocationId"
            name="pickupLocationId"
            defaultValue={firstPickup?.id}
          >
            <option value="">Seçilməyib</option>
            {fulfillment.pickupLocations.map((pickup) => (
              <option key={pickup.id} value={pickup.id}>
                {pickup.name} · {pickup.addressLine}
              </option>
            ))}
          </select>
          <label htmlFor="administrativeArea">Rayon/ərazi</label>
          <input
            id="administrativeArea"
            name="administrativeArea"
            defaultValue="baku"
          />
          <label htmlFor="addressLine">Ünvan</label>
          <textarea id="addressLine" name="addressLine" required />
          <label htmlFor="notes">Qeyd</label>
          <textarea id="notes" name="notes" />
          <label htmlFor="paymentMethod">Online ödəniş növü</label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            defaultValue={cardOption?.method ?? installmentOption?.method}
          >
            {cardOption ? (
              <option value={cardOption.method}>{cardOption.label}</option>
            ) : null}
            {installmentOption &&
            installmentOption.installmentMonths.length > 0 ? (
              <option value={installmentOption.method}>
                {installmentOption.label}
              </option>
            ) : null}
          </select>
          <label htmlFor="installmentMonths">Taksit ayı</label>
          <select
            id="installmentMonths"
            name="installmentMonths"
            defaultValue={installmentOption?.installmentMonths[0]}
          >
            <option value="">Seçilməyib</option>
            {(installmentOption?.installmentMonths ?? []).map((months) => (
              <option key={months} value={months}>
                {months} ay
              </option>
            ))}
          </select>
          <p className="payment-note">
            Online ödəniş mock sandbox provider ilə provider-hosted şəkildə
            açılır; frontend redirect deyil, signed callback nəticəsi əsas
            götürülür.
          </p>
          <button
            disabled={cart.items.length === 0}
            formAction={checkoutCash}
            type="submit"
          >
            Nağd sifariş yarat
          </button>
          <button
            disabled={
              cart.items.length === 0 || paymentOptions.methods.length === 0
            }
            formAction={checkoutOnline}
            type="submit"
          >
            Kart / taksit ilə davam et
          </button>
        </form>
      </section>
    </main>
  );
}
