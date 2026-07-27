import type { Locale } from "../locales";
import {
  TERMS_CONTACT_EMAIL,
  TERMS_CONTACT_PHONES,
} from "../legal/terms";
import { faqAz } from "./faq-az";
import { faqEn } from "./faq-en";
import { faqRu } from "./faq-ru";
import type { FaqPageContent } from "./faq-types";

export type {
  FaqBlock,
  FaqListItem,
  FaqPageContent,
  FaqSection,
} from "./faq-types";

const faqByLocale: Record<Locale, FaqPageContent> = {
  az: faqAz,
  en: faqEn,
  ru: faqRu,
};

export function getFaqPageContent(locale: Locale): FaqPageContent {
  return faqByLocale[locale];
}

export const FAQ_CONTACT_EMAIL = TERMS_CONTACT_EMAIL;
export const FAQ_CONTACT_PHONES = TERMS_CONTACT_PHONES;
