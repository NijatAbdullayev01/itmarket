import type { Locale } from "../locales";
import {
  TERMS_CONTACT_EMAIL,
  TERMS_CONTACT_PHONES,
} from "../legal/terms";
import { faqAz } from "./faq-az";
import { faqEn } from "./faq-en";
import { faqRu } from "./faq-ru";
import type { FaqBlock, FaqPageContent, FaqSection } from "./faq-types";

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

function faqBlockPlainText(block: FaqBlock): string {
  if (block.type === "p") {
    return block.text.trim();
  }
  return block.items
    .map((item) =>
      item.label?.trim()
        ? `${item.label.trim()} ${item.text.trim()}`
        : item.text.trim(),
    )
    .filter(Boolean)
    .join(" ");
}

function faqSectionAnswer(section: FaqSection): string {
  return section.blocks
    .map((block) => faqBlockPlainText(block))
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** AZ FAQ Q/A pairs for FAQPage JSON-LD (excludes trailing contact section). */
export function getFaqJsonLdItems(
  content: FaqPageContent,
): Array<{ question: string; answer: string }> {
  const bodySections = content.sections.slice(0, -1);
  return bodySections
    .map((section) => ({
      question: section.title.trim(),
      answer: faqSectionAnswer(section),
    }))
    .filter((item) => item.question && item.answer);
}

export const FAQ_CONTACT_EMAIL = TERMS_CONTACT_EMAIL;
export const FAQ_CONTACT_PHONES = TERMS_CONTACT_PHONES;
