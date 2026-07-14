"use client";

import { useTransition } from "react";

type QuantityStepperProps = {
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (next: number) => void | Promise<void>;
  label?: string;
};

export function QuantityStepper({
  value,
  min = 1,
  max,
  disabled = false,
  onChange,
  label = "Miqdar",
}: QuantityStepperProps) {
  const [isPending, startTransition] = useTransition();
  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;

  function update(next: number) {
    if (next < min) return;
    if (max !== undefined && next > max) return;
    startTransition(() => {
      void onChange(next);
    });
  }

  return (
    <div
      className="ui-stepper"
      role="group"
      aria-label={label}
      aria-busy={isPending || disabled}
    >
      <button
        type="button"
        aria-label="Miqdarı azalt"
        disabled={disabled || isPending || atMin}
        onClick={() => update(value - 1)}
      >
        −
      </button>
      <span className="ui-stepper__value" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label="Miqdarı artır"
        disabled={disabled || isPending || atMax}
        onClick={() => update(value + 1)}
      >
        +
      </button>
    </div>
  );
}
