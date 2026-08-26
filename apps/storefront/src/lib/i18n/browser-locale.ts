import { useSyncExternalStore } from "react";

import {
  LOCALE_COOKIE,
  parseLocale,
  pickLocaleFromAcceptLanguage,
  UI_FALLBACK_LOCALE,
  type Locale,
} from "./locales";

/**
 * Detect the visitor's language from the browser itself (no server helpers
 * available), mirroring the server-side `Accept-Language` resolution:
 * AZ → AZ, RU → RU, anything else → EN.
 */
export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") {
    return pickLocaleFromAcceptLanguage(null);
  }
  const preferred =
    Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages.join(",")
      : navigator.language;
  return pickLocaleFromAcceptLanguage(preferred);
}

/**
 * Client-side locale resolution for error boundaries, where server helpers
 * are unavailable. An explicit `itmarket_locale` cookie wins; otherwise the
 * browser's own language preference is used — same layering as
 * `getRequestLocale` on the server.
 */
export function getClientLocale(): Locale {
  if (typeof document === "undefined") {
    return detectBrowserLocale();
  }
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`),
  );
  if (match) {
    return parseLocale(decodeURIComponent(match[1]));
  }
  return detectBrowserLocale();
}

const subscribeToBrowserLocale = () => () => {};

/**
 * React hook exposing the browser-detected locale for client-only components
 * (error boundaries). Uses `useSyncExternalStore` with a server snapshot so
 * the initial render is deterministic (no hydration mismatch) and the real
 * value only appears after hydration.
 */
export function useBrowserLocale(): Locale {
  return useSyncExternalStore(
    subscribeToBrowserLocale,
    () => getClientLocale(),
    () => UI_FALLBACK_LOCALE,
  );
}
