import type { Locale } from "../locales";
import {
  TERMS_CONTACT_EMAIL,
  TERMS_CONTACT_PHONES,
} from "../legal/terms";
import { installmentAz } from "./installment-az";
import { installmentEn } from "./installment-en";
import { installmentRu } from "./installment-ru";
import type { InstallmentPageContent } from "./installment-types";

export type {
  InstallmentBlock,
  InstallmentListItem,
  InstallmentPageContent,
  InstallmentSection,
} from "./installment-types";

const installmentByLocale: Record<Locale, InstallmentPageContent> = {
  az: installmentAz,
  en: installmentEn,
  ru: installmentRu,
};

export function getInstallmentPageContent(
  locale: Locale,
): InstallmentPageContent {
  return installmentByLocale[locale];
}

export const INSTALLMENT_CONTACT_EMAIL = TERMS_CONTACT_EMAIL;
export const INSTALLMENT_CONTACT_PHONES = TERMS_CONTACT_PHONES;
