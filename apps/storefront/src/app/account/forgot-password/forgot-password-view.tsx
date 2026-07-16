"use client";

import { AccountForgotPasswordForm } from "@itmarket/ui";

import { customerForgotPassword } from "@/app/actions";

export function ForgotPasswordView() {
  return <AccountForgotPasswordForm onSubmit={customerForgotPassword} />;
}
