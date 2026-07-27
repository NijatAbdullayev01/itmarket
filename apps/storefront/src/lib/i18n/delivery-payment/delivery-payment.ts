import type { Locale } from "../locales";
import {
  TERMS_CONTACT_EMAIL,
  TERMS_CONTACT_PHONES,
} from "../legal/terms";
import { deliveryPaymentAz } from "./delivery-payment-az";
import { deliveryPaymentEn } from "./delivery-payment-en";
import { deliveryPaymentRu } from "./delivery-payment-ru";
import type { DeliveryPaymentPageContent } from "./delivery-payment-types";

export type {
  DeliveryPaymentBlock,
  DeliveryPaymentListItem,
  DeliveryPaymentPageContent,
  DeliveryPaymentSection,
} from "./delivery-payment-types";

const deliveryPaymentByLocale: Record<Locale, DeliveryPaymentPageContent> = {
  az: deliveryPaymentAz,
  en: deliveryPaymentEn,
  ru: deliveryPaymentRu,
};

export function getDeliveryPaymentPageContent(
  locale: Locale,
): DeliveryPaymentPageContent {
  return deliveryPaymentByLocale[locale];
}

export const DELIVERY_PAYMENT_CONTACT_EMAIL = TERMS_CONTACT_EMAIL;
export const DELIVERY_PAYMENT_CONTACT_PHONES = TERMS_CONTACT_PHONES;
