"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [override, setOverride] = useState<{
    from: Locale;
    to: Locale;
  } | null>(null);

  const locale =
    override !== null && override.from === serverLocale
      ? override.to
      : serverLocale;

  const messages = useMemo(() => getMessages(locale), [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      setOverride({ from: serverLocale, to: next });
      writeLocaleCookie(next);
      document.documentElement.lang = next;
      startTransition(() => {
        router.refresh();
      });
    },
    [locale, router, serverLocale],
  );

  const value = useMemo(
    () => ({ locale, messages, setLocale, isPending }),
    [locale, messages, setLocale, isPending],
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
