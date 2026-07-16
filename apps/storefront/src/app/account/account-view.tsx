"use client";

import {
  AccountAuthForm,
  type CustomerProfile,
} from "@itmarket/ui";

import {
  customerLogin,
  customerLogout,
  customerRegister,
} from "@/app/actions";

type AccountViewProps = {
  customer: CustomerProfile | null;
};

export function AccountView({ customer }: AccountViewProps) {
  return (
    <AccountAuthForm
      customer={customer}
      onLogin={customerLogin}
      onRegister={customerRegister}
      onLogout={customerLogout}
    />
  );
}
