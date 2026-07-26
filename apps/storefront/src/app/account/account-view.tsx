"use client";

import {
  AccountAuthForm,
  AccountDashboard,
  type AccountAddress,
  type AccountAuthFormCopy,
  type AccountCustomerProfile,
  type AccountDashboardCopy,
  type AccountOrder,
  type CustomerProfile,
  type OrderStatusLabelMaps,
} from "@itmarket/ui";

import {
  customerCreateAddress,
  customerCancelOrder,
  customerCreateProductReview,
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
  authFormCopy?: AccountAuthFormCopy;
  dashboardCopy?: AccountDashboardCopy;
  statusLabelMaps?: OrderStatusLabelMaps;
};

export function AccountView({
  customer,
  profile,
  orders,
  addresses,
  authFormCopy,
  dashboardCopy,
  statusLabelMaps,
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
        onCreateReview={customerCreateProductReview}
        onLogout={customerLogout}
        copy={dashboardCopy}
        statusLabelMaps={statusLabelMaps}
      />
    );
  }

  return (
    <AccountAuthForm
      customer={customer}
      onLogin={customerLogin}
      onRegister={customerRegister}
      copy={authFormCopy}
    />
  );
}
