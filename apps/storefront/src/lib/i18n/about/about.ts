import type { Locale } from "../locales";
import {
  TERMS_CONTACT_EMAIL,
  TERMS_CONTACT_PHONES,
} from "../legal/terms";
import { aboutAz } from "./about-az";
import { aboutEn } from "./about-en";
import { aboutRu } from "./about-ru";
import type { AboutPageContent } from "./about-types";

export type {
  AboutBlock,
  AboutListItem,
  AboutPageContent,
  AboutSection,
} from "./about-types";

const aboutByLocale: Record<Locale, AboutPageContent> = {
  az: aboutAz,
  en: aboutEn,
  ru: aboutRu,
};

export function getAboutPageContent(locale: Locale): AboutPageContent {
  return aboutByLocale[locale];
}

export const ABOUT_CONTACT_EMAIL = TERMS_CONTACT_EMAIL;
export const ABOUT_CONTACT_PHONES = TERMS_CONTACT_PHONES;
