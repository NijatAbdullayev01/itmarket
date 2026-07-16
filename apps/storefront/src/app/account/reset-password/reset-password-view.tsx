"use client";

import { AccountResetPasswordForm } from "@itmarket/ui";

import { customerResetPassword } from "@/app/actions";

type ResetPasswordViewProps = {
  token: string;
};

export function ResetPasswordView({ token }: ResetPasswordViewProps) {
  return (
    <AccountResetPasswordForm
      token={token}
      onSubmit={customerResetPassword}
    />
  );
}
