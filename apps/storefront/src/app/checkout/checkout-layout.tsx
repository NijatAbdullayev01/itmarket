"use client";

import { useCallback, useState } from "react";

import { CartLines } from "@/app/cart/cart-lines";
import type { Cart } from "@/lib/api";
import { toOrderSummaryCopy } from "@/lib/i18n";
import { useMessages } from "@/components/locale-provider";
import {
  CheckoutProgressBar,
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
  paymentsClosed?: boolean;
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
  paymentsClosed = false,
  checkoutCashAction,
  checkoutOnlineAction,
  initialCustomer = null,
  checkoutWizardCopy,
}: CheckoutLayoutProps) {
  const messages = useMessages();
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [completedSteps, setCompletedSteps] = useState<readonly number[]>([]);

  const handleStepCompletionChange = useCallback(
    (nextSteps: readonly number[]) => {
      setCompletedSteps((previous) => {
        if (
          previous.length === nextSteps.length &&
          previous.every((step, index) => step === nextSteps[index])
        ) {
          return previous;
        }
        return nextSteps;
      });
    },
    [],
  );

  return (
    <>
      <CheckoutProgressBar completedSteps={completedSteps} />
      <section className="ui-cart-layout">
        <CheckoutWizard
          cartId={cartId}
          subtotal={subtotal}
          initialFulfillment={initialFulfillment}
          paymentMethods={paymentMethods}
          paymentsClosed={paymentsClosed}
          checkoutCashAction={checkoutCashAction}
          checkoutOnlineAction={checkoutOnlineAction}
          hideInlineSummary
          onDeliveryFeeChange={setDeliveryFee}
          onStepCompletionChange={handleStepCompletionChange}
          initialCustomer={initialCustomer}
          copy={checkoutWizardCopy}
          aside={
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
          }
        />
      </section>
    </>
  );
}
