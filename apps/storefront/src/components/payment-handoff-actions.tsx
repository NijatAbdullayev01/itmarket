"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@itmarket/ui";

function HandoffSubmitButton({
  action,
  variant,
  children,
}: {
  action: "proceed" | "cancel";
  variant?: "primary" | "ghost";
  children: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      name="action"
      value={action}
      type="submit"
      variant={variant}
      block
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? "Gözləyin…" : children}
    </Button>
  );
}

export function PaymentHandoffActions({
  action,
  attemptToken,
  orderNumber,
}: {
  action: (formData: FormData) => Promise<void>;
  attemptToken: string;
  orderNumber: string;
}) {
  return (
    <form className="ui-payment-mock__actions" action={action}>
      <input type="hidden" name="attemptToken" value={attemptToken} />
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <HandoffSubmitButton action="proceed">Ödənişə keç</HandoffSubmitButton>
      <HandoffSubmitButton action="cancel" variant="ghost">
        Ləğv et
      </HandoffSubmitButton>
    </form>
  );
}
