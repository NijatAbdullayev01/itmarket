import { IconChevronRight, IconWarranty } from "./icons";

const checkoutSteps = [
  { id: 1, label: "Məlumat" },
  { id: 2, label: "Çatdırılma" },
  { id: 3, label: "Ödəniş" },
] as const;

export function CheckoutProgressBar() {
  return (
    <nav className="ui-checkout-progress-bar" aria-label="Sifariş addımları">
      <p className="ui-checkout-progress-bar__message">
        <IconWarranty className="ui-checkout-progress-bar__icon" />
        <span>
          Sifarişinizi uğurla təsdiqləmək üçün aşağıdakı 3 sadə addımı
          tamamlamağınız xahiş olunur.
        </span>
      </p>
      <ol className="ui-checkout-progress-bar__steps">
        {checkoutSteps.map((step, index) => (
          <li key={step.id} className="ui-checkout-progress-bar__step-item">
            {index > 0 ? (
              <IconChevronRight
                className="ui-checkout-progress-bar__sep"
                aria-hidden="true"
              />
            ) : null}
            <span className="ui-checkout-progress-bar__step">
              <span className="ui-checkout-progress-bar__step-num">
                {step.id}
              </span>
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
