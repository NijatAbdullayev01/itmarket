import { cookies } from "next/headers";
import { cache } from "react";

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./locales";

/**
 * Resolve the active storefront locale for the current request.
 * Explicit cookie preference wins; otherwise AZ (site primary language).
 * Cached per-request so page + @subnav + sections share one cookies() read.
 */
export const getRequestLocale = cache(async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) {
    return fromCookie;
  }
  return DEFAULT_LOCALE;
});
