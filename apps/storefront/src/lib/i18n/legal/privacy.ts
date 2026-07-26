import type { Locale } from "../locales";
import { privacyAz } from "./privacy-az";
import { privacyEn } from "./privacy-en";
import { privacyRu } from "./privacy-ru";
import type { PrivacyPageContent } from "./privacy-types";
import {
  TERMS_CONTACT_EMAIL,
  TERMS_CONTACT_PHONES,
} from "./terms";

export type {
  PrivacyBlock,
  PrivacyListItem,
  PrivacyPageContent,
  PrivacySection,
} from "./privacy-types";

const privacyByLocale: Record<Locale, PrivacyPageContent> = {
  az: privacyAz,
  en: privacyEn,
  ru: privacyRu,
};

export function getPrivacyPageContent(locale: Locale): PrivacyPageContent {
  return privacyByLocale[locale];
}

export const PRIVACY_CONTACT_EMAIL = TERMS_CONTACT_EMAIL;
export const PRIVACY_CONTACT_PHONES = TERMS_CONTACT_PHONES;
