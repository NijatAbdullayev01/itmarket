import { cookies, headers } from "next/headers";
import { cache } from "react";

import {
  isLocale,
  LOCALE_COOKIE,
  pickLocaleFromAcceptLanguage,
  type Locale,
} from "./locales";

/**
 * Resolve the active storefront UI locale for the current request.
 *
 * Priority:
 * 1. Explicit visitor choice — `itmarket_locale` cookie.
 * 2. Visitor's browser/system language — `Accept-Language` header
 *    (AZ → AZ, RU → RU, anything else → EN).
 * 3. `UI_FALLBACK_LOCALE` (EN) when neither signal is present.
 *
 * Cached per-request so page + @subnav + sections share one cookies()/headers()
 * read.
 */
export const getRequestLocale = cache(async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) {
    return fromCookie;
  }
  const headerStore = await headers();
  return pickLocaleFromAcceptLanguage(headerStore.get("accept-language"));
});
