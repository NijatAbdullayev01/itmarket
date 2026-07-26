"use client";

import { useState } from "react";

import { CartLines } from "@/app/cart/cart-lines";
import type { Cart } from "@/lib/api";
import { toOrderSummaryCopy } from "@/lib/i18n";
import { useMessages } from "@/components/locale-provider";
import {
  CheckoutWizard,
  OrderSummary,
  type CheckoutCustomerPrefill,
  type CheckoutWizardCopy,
} from "@itmarket/ui";

type CheckoutLayoutProps = {
  cartId: string;
  subtotal: string;
  itemCount: number;
  discountTotal: string;
  items: Cart["items"];
  initialFulfillment: {
    deliveryZones: {
      id: string;
      name: string;
      fee: string;
      freeDeliveryMinimum: string | null;
      estimatedMinDays: number;
      estimatedMaxDays: number;
    }[];
    pickupLocations: {
      id: string;
      name: string;
      addressLine: string;
    }[];
  };
  paymentMethods: {
    method: "CARD" | "INSTALLMENT";
    label: string;
    installmentMonths: number[];
  }[];
  checkoutCashAction: (formData: FormData) => void | Promise<void>;
  checkoutOnlineAction: (formData: FormData) => void | Promise<void>;
  initialCustomer?: CheckoutCustomerPrefill | null;
  checkoutWizardCopy?: CheckoutWizardCopy;
};

export function CheckoutLayout({
  cartId,
  subtotal,
  itemCount,
  discountTotal,
  items,
  initialFulfillment,
  paymentMethods,
  checkoutCashAction,
  checkoutOnlineAction,
  initialCustomer = null,
  checkoutWizardCopy,
}: CheckoutLayoutProps) {
  const messages = useMessages();
  const [deliveryFee, setDeliveryFee] = useState("0");

  return (
    <section className="ui-cart-layout">
      <div className="ui-cart-layout__main">
        <CheckoutWizard
          cartId={cartId}
          subtotal={subtotal}
          initialFulfillment={initialFulfillment}
          paymentMethods={paymentMethods}
          checkoutCashAction={checkoutCashAction}
          checkoutOnlineAction={checkoutOnlineAction}
          hideInlineSummary
          onDeliveryFeeChange={setDeliveryFee}
          initialCustomer={initialCustomer}
          copy={checkoutWizardCopy}
        />
      </div>
      <div>
        <OrderSummary
          subtotal={subtotal}
          itemCount={itemCount}
          discountTotal={discountTotal}
          deliveryFee={deliveryFee}
          cartLines={
            <CartLines cartId={cartId} items={items} variant="summary" />
          }
          copy={toOrderSummaryCopy(messages)}
        />
      </div>
    </section>
  );
}
