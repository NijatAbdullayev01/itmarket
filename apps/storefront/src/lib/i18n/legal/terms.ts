import type { Locale } from "../locales";
import { termsAz } from "./terms-az";
import { termsEn } from "./terms-en";
import { termsRu } from "./terms-ru";
import type { TermsPageContent } from "./terms-types";

export type { TermsBlock, TermsListItem, TermsPageContent, TermsSection } from "./terms-types";

const termsByLocale: Record<Locale, TermsPageContent> = {
  az: termsAz,
  en: termsEn,
  ru: termsRu,
};

export function getTermsPageContent(locale: Locale): TermsPageContent {
  return termsByLocale[locale];
}

/** Contact email used in terms body links. */
export const TERMS_CONTACT_EMAIL = "info@it-market.org";

export const TERMS_CONTACT_PHONES = [
  { href: "tel:+994512509585", label: "+994 51 250 95 85" },
  { href: "tel:+994512509586", label: "+994 51 250 95 86" },
] as const;
