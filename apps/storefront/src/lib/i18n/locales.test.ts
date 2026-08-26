import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOCALE,
  isLocale,
  parseLocale,
  pickLocaleFromAcceptLanguage,
  localeToOgLocale,
  UI_FALLBACK_LOCALE,
} from "./locales";

describe("i18n locales", () => {
  it("recognizes supported locales only", () => {
    expect(isLocale("az")).toBe(true);
    expect(isLocale("ru")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("tr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it("keeps the canonical/SEO locale AZ while unknown values fall back to EN", () => {
    expect(DEFAULT_LOCALE).toBe("az");
    expect(UI_FALLBACK_LOCALE).toBe("en");
    expect(parseLocale("ru")).toBe("ru");
    expect(parseLocale("nope")).toBe(UI_FALLBACK_LOCALE);
    expect(parseLocale(null)).toBe(UI_FALLBACK_LOCALE);
  });

  it("maps locales to Open Graph locale tags", () => {
    expect(localeToOgLocale("az")).toBe("az_AZ");
    expect(localeToOgLocale("ru")).toBe("ru_RU");
    expect(localeToOgLocale("en")).toBe("en_US");
  });

  it("picks the best Accept-Language match", () => {
    expect(pickLocaleFromAcceptLanguage("az-AZ,az;q=0.9,en;q=0.8")).toBe("az");
    expect(pickLocaleFromAcceptLanguage("ru-RU,ru;q=0.9,en;q=0.8")).toBe("ru");
    expect(pickLocaleFromAcceptLanguage("en-US,en;q=0.9")).toBe("en");
    expect(pickLocaleFromAcceptLanguage("de-DE,de;q=0.9")).toBe(
      UI_FALLBACK_LOCALE,
    );
    expect(pickLocaleFromAcceptLanguage(null)).toBe(UI_FALLBACK_LOCALE);
  });
});
