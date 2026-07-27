import type { Locale } from "../locales";
import {
  TERMS_CONTACT_EMAIL,
  TERMS_CONTACT_PHONES,
} from "../legal/terms";
import { returnsAz } from "./returns-az";
import { returnsEn } from "./returns-en";
import { returnsRu } from "./returns-ru";
import type { ReturnsPageContent } from "./returns-types";

export type {
  ReturnsBlock,
  ReturnsListItem,
  ReturnsPageContent,
  ReturnsSection,
} from "./returns-types";

const returnsByLocale: Record<Locale, ReturnsPageContent> = {
  az: returnsAz,
  en: returnsEn,
  ru: returnsRu,
};

export function getReturnsPageContent(locale: Locale): ReturnsPageContent {
  return returnsByLocale[locale];
}

export const RETURNS_CONTACT_EMAIL = TERMS_CONTACT_EMAIL;
export const RETURNS_CONTACT_PHONES = TERMS_CONTACT_PHONES;
