"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@itmarket/ui";
import { useMessages } from "@/components/locale-provider";

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
  const messages = useMessages();

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
      {pending ? messages.checkout.waiting : children}
    </Button>
  );
}

export function PaymentHandoffActions({
  action,
  orderNumber,
}: {
  action: (formData: FormData) => Promise<void>;
  orderNumber: string;
}) {
  const messages = useMessages();

  return (
    <form className="ui-payment-mock__actions" action={action}>
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <HandoffSubmitButton action="proceed">{messages.checkout.proceedToPayment}</HandoffSubmitButton>
      <HandoffSubmitButton action="cancel" variant="ghost">
        {messages.checkout.cancel}
      </HandoffSubmitButton>
    </form>
  );
}
