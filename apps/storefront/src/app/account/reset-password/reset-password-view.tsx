"use client";

import { AccountResetPasswordForm } from "@itmarket/ui";

import { customerResetPassword } from "@/app/actions";
import { useMessages } from "@/components/locale-provider";
import { toAccountResetPasswordFormCopy } from "@/lib/i18n";

type ResetPasswordViewProps = {
  token: string;
};

export function ResetPasswordView({ token }: ResetPasswordViewProps) {
  const messages = useMessages();

  return (
    <AccountResetPasswordForm
      token={token}
      onSubmit={customerResetPassword}
      copy={toAccountResetPasswordFormCopy(messages)}
    />
  );
}
