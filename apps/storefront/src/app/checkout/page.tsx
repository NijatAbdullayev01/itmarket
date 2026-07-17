import { redirect } from "next/navigation";

import { checkoutCash, checkoutOnline } from "@/app/actions";
import { CheckoutLayout } from "@/app/checkout/checkout-layout";
import {
  getCart,
  getFulfillmentOptions,
  getPaymentOptions,
} from "@/lib/api";
import { getGuestCartSession } from "@/lib/cart-session";
import {
  fetchCustomerAddresses,
  fetchCustomerProfile,
  type CustomerAccountAddress,
  type CustomerAccountProfile,
} from "@/lib/customer-account";
import {
  getCustomerProfile,
  getCustomerSessionToken,
} from "@/lib/customer-session";
import {
  CheckoutProgressBar,
  type CheckoutCustomerPrefill,
} from "@itmarket/ui";

export const metadata = {
  title: "Sifarişi rəsmiləşdir",
  description:
    "IT Market sifarişi — çatdırılma, pickup və ödəniş seçimləri ilə checkout.",
};

function splitRecipientName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0] ?? "", lastName: "" };
  }
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function pickDefaultAddress(addresses: CustomerAccountAddress[]) {
  return (
    addresses.find((address) => address.isDefault) ?? addresses[0] ?? null
  );
}

function buildCheckoutCustomerPrefill(
  profile: CustomerAccountProfile,
  addresses: CustomerAccountAddress[],
): CheckoutCustomerPrefill {
  const defaultAddress = pickDefaultAddress(addresses);
  const fromRecipient =
    defaultAddress !== null
      ? splitRecipientName(defaultAddress.recipientName)
      : { firstName: "", lastName: "" };

  return {
    firstName: profile.firstName?.trim() || fromRecipient.firstName,
    lastName: profile.lastName?.trim() || fromRecipient.lastName,
    phone: profile.phone?.trim() || defaultAddress?.phone?.trim() || "",
    email: profile.email.trim(),
    administrativeArea: defaultAddress?.administrativeArea?.trim() || "",
    addressLine: defaultAddress?.addressLine?.trim() || "",
    notes: defaultAddress?.notes?.trim() || "",
  };
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ cartId?: string }>;
}) {
  const [{ cartId: queryCartId }, session, customer, sessionToken] =
    await Promise.all([
      searchParams,
      getGuestCartSession(),
      getCustomerProfile(),
      getCustomerSessionToken(),
    ]);
  const cartId = queryCartId ?? session.cartId;

  if (cartId === undefined) {
    redirect("/cart");
  }

  const cart = await getCart(cartId);

  if (cart.items.length === 0) {
    redirect("/cart");
  }

  const [fulfillment, paymentOptions, profileResult, addressesResult] =
    await Promise.all([
      getFulfillmentOptions(cartId),
      getPaymentOptions(cartId),
      customer !== null && sessionToken !== undefined
        ? fetchCustomerProfile(sessionToken)
        : Promise.resolve(null),
      customer !== null && sessionToken !== undefined
        ? fetchCustomerAddresses(sessionToken)
        : Promise.resolve(null),
    ]);

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const discountTotal = cart.items
    .reduce((sum, item) => {
      if (item.linePreviousTotal === null) {
        return sum;
      }

      const savings = Number(item.linePreviousTotal) - Number(item.lineTotal);
      return savings > 0 ? sum + savings : sum;
    }, 0)
    .toFixed(2);

  const profile =
    profileResult?.ok === true
      ? profileResult.data
      : customer !== null
        ? {
            id: customer.id,
            email: customer.email,
            firstName: customer.firstName ?? null,
            lastName: customer.lastName ?? null,
            phone: customer.phone ?? null,
          }
        : null;
  const addresses =
    addressesResult?.ok === true ? addressesResult.data : [];
  const initialCustomer =
    profile !== null
      ? buildCheckoutCustomerPrefill(profile, addresses)
      : null;

  return (
    <div className="ui-container">
      <CheckoutProgressBar />
      <CheckoutLayout
        cartId={cart.id}
        subtotal={cart.subtotal}
        itemCount={itemCount}
        discountTotal={discountTotal}
        items={cart.items}
        initialFulfillment={fulfillment}
        paymentMethods={paymentOptions.methods}
        checkoutCashAction={checkoutCash}
        checkoutOnlineAction={checkoutOnline}
        initialCustomer={initialCustomer}
      />
    </div>
  );
}
