"use client";

import { AccountForgotPasswordForm } from "@itmarket/ui";

import { customerForgotPassword } from "@/app/actions";
import { useMessages } from "@/components/locale-provider";
import { toAccountForgotPasswordFormCopy } from "@/lib/i18n";

export function ForgotPasswordView() {
  const messages = useMessages();

  return (
    <AccountForgotPasswordForm
      onSubmit={customerForgotPassword}
      copy={toAccountForgotPasswordFormCopy(messages)}
    />
  );
}
