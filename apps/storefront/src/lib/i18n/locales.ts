export const LOCALES = ["az", "ru", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "az";

export const LOCALE_COOKIE = "itmarket_locale";

/** One year — language preference should stick across visits. */
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const LOCALE_LABELS: Record<Locale, string> = {
  az: "AZ",
  ru: "RU",
  en: "EN",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function parseLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function localeToHtmlLang(locale: Locale): string {
  return locale;
}

export function localeToOgLocale(locale: Locale): string {
  switch (locale) {
    case "az":
      return "az_AZ";
    case "ru":
      return "ru_RU";
    case "en":
      return "en_US";
  }
}

/**
 * Pick the best supported locale from an Accept-Language header.
 * Falls back to AZ (site primary language).
 */
export function pickLocaleFromAcceptLanguage(
  header: string | null | undefined,
): Locale {
  if (!header?.trim()) {
    return DEFAULT_LOCALE;
  }

  const candidates = header
    .split(",")
    .map((part) => {
      const [rawTag, ...params] = part.trim().split(";");
      const qParam = params.find((param) => param.trim().startsWith("q="));
      const q = qParam ? Number(qParam.trim().slice(2)) : 1;
      return {
        tag: rawTag.trim().toLowerCase(),
        q: Number.isFinite(q) ? q : 0,
      };
    })
    .filter((entry) => entry.tag.length > 0)
    .sort((left, right) => right.q - left.q);

  for (const { tag } of candidates) {
    if (tag === "az" || tag.startsWith("az-")) return "az";
    if (tag === "ru" || tag.startsWith("ru-")) return "ru";
    if (tag === "en" || tag.startsWith("en-")) return "en";
  }

  return DEFAULT_LOCALE;
}

export function writeLocaleCookie(locale: Locale) {
  if (typeof document === "undefined") return;
  const secure =
    window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}
