import type { Locale } from "../locales";
import {
  TERMS_CONTACT_EMAIL,
  TERMS_CONTACT_PHONES,
} from "../legal/terms";
import { corporateAz } from "./corporate-az";
import { corporateEn } from "./corporate-en";
import { corporateRu } from "./corporate-ru";
import type { CorporatePageContent } from "./corporate-types";

export type {
  CorporateBenefit,
  CorporateBlock,
  CorporateListItem,
  CorporatePageContent,
  CorporateSection,
  CorporateStep,
} from "./corporate-types";

const corporateByLocale: Record<Locale, CorporatePageContent> = {
  az: corporateAz,
  en: corporateEn,
  ru: corporateRu,
};

export function getCorporatePageContent(locale: Locale): CorporatePageContent {
  return corporateByLocale[locale];
}

export const CORPORATE_CONTACT_EMAIL = TERMS_CONTACT_EMAIL;
export const CORPORATE_CONTACT_PHONES = TERMS_CONTACT_PHONES;

export function buildCorporateInquiryHref(
  email: string,
  subject: string,
): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}
