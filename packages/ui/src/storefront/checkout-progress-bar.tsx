import { IconCheck, IconChevronRight, IconWarranty } from "./icons";

const checkoutSteps = [
  { id: 1, label: "Məlumat" },
  { id: 2, label: "Təhvil" },
  { id: 3, label: "Ödəniş" },
] as const;

export type CheckoutProgressBarProps = {
  /** Completed checkout step ids (1 = Məlumat, 2 = Təhvil, 3 = Ödəniş). */
  completedSteps?: readonly number[];
};

export function CheckoutProgressBar({
  completedSteps = [],
}: CheckoutProgressBarProps) {
  const completed = new Set(completedSteps);

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
        {checkoutSteps.map((step, index) => {
          const isComplete = completed.has(step.id);

          return (
            <li key={step.id} className="ui-checkout-progress-bar__step-item">
              {index > 0 ? (
                <span
                  className={
                    completed.has(checkoutSteps[index - 1].id)
                      ? "ui-checkout-progress-bar__sep ui-checkout-progress-bar__sep--complete"
                      : "ui-checkout-progress-bar__sep"
                  }
                  aria-hidden="true"
                >
                  <IconChevronRight className="ui-checkout-progress-bar__sep-icon" />
                </span>
              ) : null}
              <span
                className={
                  isComplete
                    ? "ui-checkout-progress-bar__step ui-checkout-progress-bar__step--complete"
                    : "ui-checkout-progress-bar__step"
                }
              >
                <span
                  className="ui-checkout-progress-bar__step-num"
                  aria-hidden={isComplete ? true : undefined}
                >
                  {isComplete ? <IconCheck /> : step.id}
                </span>
                <span className="ui-checkout-progress-bar__step-label">
                  {step.label}
                  {isComplete ? (
                    <span className="sr-only"> (tamamlandı)</span>
                  ) : null}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
