import { cookies } from "next/headers";

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./locales";

/**
 * Resolve the active storefront locale for the current request.
 * Explicit cookie preference wins; otherwise AZ (site primary language).
 */
export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) {
    return fromCookie;
  }
  return DEFAULT_LOCALE;
}
