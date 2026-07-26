import type { Locale } from "../locales";

import { az } from "./az";
import { en } from "./en";
import { ru } from "./ru";

export type { StorefrontMessages } from "./types";

export const messagesByLocale: Record<Locale, import("./types").StorefrontMessages> = {
  az,
  ru,
  en,
};

export function getMessages(locale: Locale): import("./types").StorefrontMessages {
  return messagesByLocale[locale];
}

export function formatMessage(
  template: string,
  vars: Record<string, string | number>,
): string {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}
