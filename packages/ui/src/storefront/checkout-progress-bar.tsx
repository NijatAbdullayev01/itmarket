import { IconCheck, IconChevronRight, IconWarranty } from "./icons";

export type CheckoutProgressBarStep = {
  id: number;
  label: string;
};

export type CheckoutProgressBarCopy = {
  ariaLabel?: string;
  message?: string;
  steps?: readonly CheckoutProgressBarStep[];
  stepCompletedSrOnly?: string;
};

const defaultCheckoutSteps: readonly CheckoutProgressBarStep[] = [
  { id: 1, label: "Məlumat" },
  { id: 2, label: "Təhvil" },
  { id: 3, label: "Ödəniş" },
] as const;

export const defaultCheckoutProgressBarCopy: Required<CheckoutProgressBarCopy> = {
  ariaLabel: "Sifariş addımları",
  message:
    "Sifarişinizi uğurla təsdiqləmək üçün aşağıdakı 3 sadə addımı tamamlamağınız xahiş olunur.",
  steps: defaultCheckoutSteps,
  stepCompletedSrOnly: " (tamamlandı)",
};

export type CheckoutProgressBarProps = {
  /** Completed checkout step ids (1 = Məlumat, 2 = Təhvil, 3 = Ödəniş). */
  completedSteps?: readonly number[];
  copy?: CheckoutProgressBarCopy;
};

export function CheckoutProgressBar({
  completedSteps = [],
  copy,
}: CheckoutProgressBarProps) {
  const c = { ...defaultCheckoutProgressBarCopy, ...copy };
  const steps = c.steps ?? defaultCheckoutSteps;
  const completed = new Set(completedSteps);

  return (
    <nav className="ui-checkout-progress-bar" aria-label={c.ariaLabel}>
      <p className="ui-checkout-progress-bar__message">
        <IconWarranty className="ui-checkout-progress-bar__icon" />
        <span>{c.message}</span>
      </p>
      <ol className="ui-checkout-progress-bar__steps">
        {steps.map((step, index) => {
          const isComplete = completed.has(step.id);

          return (
            <li key={step.id} className="ui-checkout-progress-bar__step-item">
              {index > 0 ? (
                <span
                  className={
                    completed.has(steps[index - 1].id)
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
                    <span className="sr-only">{c.stepCompletedSrOnly}</span>
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
