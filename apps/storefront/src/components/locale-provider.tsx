"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

import {
  formatMessage,
  getMessages,
  writeLocaleCookie,
  type Locale,
  type StorefrontMessages,
} from "@/lib/i18n";

type LocaleContextValue = {
  locale: Locale;
  messages: StorefrontMessages;
  setLocale: (locale: Locale) => void;
  isPending: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale: serverLocale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const locale = serverLocale;
  const messages = useMemo(() => getMessages(locale), [locale]);

  // Sync document lang attribute with current locale after hydration
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      writeLocaleCookie(next);
      // Full page reload ensures clean CSS/DOM state after locale change.
      // router.refresh() caused layout flicker during RSC streaming.
      window.location.reload();
    },
    [locale],
  );

  // isPending kept for API compatibility (always false with full reload)
  const value = useMemo(
    () => ({ locale, messages, setLocale, isPending: false }),
    [locale, messages, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
}

export function useMessages() {
  return useLocale().messages;
}

export function useFormatMessage() {
  return formatMessage;
}
