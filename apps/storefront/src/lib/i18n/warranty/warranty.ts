import type { Locale } from "../locales";
import {
  TERMS_CONTACT_EMAIL,
  TERMS_CONTACT_PHONES,
} from "../legal/terms";
import { warrantyAz } from "./warranty-az";
import { warrantyEn } from "./warranty-en";
import { warrantyRu } from "./warranty-ru";
import type { WarrantyPageContent } from "./warranty-types";

export type {
  WarrantyBlock,
  WarrantyListItem,
  WarrantyPageContent,
  WarrantySection,
} from "./warranty-types";

const warrantyByLocale: Record<Locale, WarrantyPageContent> = {
  az: warrantyAz,
  en: warrantyEn,
  ru: warrantyRu,
};

export function getWarrantyPageContent(locale: Locale): WarrantyPageContent {
  return warrantyByLocale[locale];
}

export const WARRANTY_CONTACT_EMAIL = TERMS_CONTACT_EMAIL;
export const WARRANTY_CONTACT_PHONES = TERMS_CONTACT_PHONES;
