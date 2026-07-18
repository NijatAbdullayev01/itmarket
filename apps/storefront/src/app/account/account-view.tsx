"use client";

import {
  AccountAuthForm,
  AccountDashboard,
  type AccountAddress,
  type AccountCustomerProfile,
  type AccountOrder,
  type CustomerProfile,
} from "@itmarket/ui";

import {
  customerCreateAddress,
  customerCancelOrder,
  customerDeleteAddress,
  customerLogin,
  customerLogout,
  customerRegister,
  customerUpdateAddress,
  customerUpdateProfile,
} from "@/app/actions";

type AccountViewProps = {
  customer: CustomerProfile | null;
  profile: AccountCustomerProfile | null;
  orders: AccountOrder[];
  addresses: AccountAddress[];
};

export function AccountView({
  customer,
  profile,
  orders,
  addresses,
}: AccountViewProps) {
  if (customer !== null && profile !== null) {
    return (
      <AccountDashboard
        profile={profile}
        orders={orders}
        addresses={addresses}
        onUpdateProfile={customerUpdateProfile}
        onCreateAddress={customerCreateAddress}
        onUpdateAddress={customerUpdateAddress}
        onDeleteAddress={customerDeleteAddress}
        onCancelOrder={customerCancelOrder}
        onLogout={customerLogout}
      />
    );
  }

  return (
    <AccountAuthForm
      customer={customer}
      onLogin={customerLogin}
      onRegister={customerRegister}
    />
  );
}
