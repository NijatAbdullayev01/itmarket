"use client";

import { Suspense, useCallback, type ReactNode } from "react";

import {
  StorefrontShell,
  type ChatBubbleProps,
  type HeaderCatalogBrand,
  type HeaderCatalogCategory,
  type SupportChatSession,
} from "@itmarket/ui";
import type { SupportChatRealtimeEvent } from "@itmarket/contracts";
import { CartCompleteBarHost } from "@/components/cart-complete-bar-host";
import { HeaderAccountLink } from "@/components/header-account-link";
import { HeaderCompareLink } from "@/components/header-compare-link";
import { HeaderFavoritesLink } from "@/components/header-favorites-link";
import { HeaderLanguageSwitcher } from "@/components/header-language-switcher";
import { LocaleProvider, useLocale } from "@/components/locale-provider";
import { ScrollToTopOnNavigate } from "@/components/scroll-to-top-on-navigate";
import {
  toChromeCopy,
  withLocalizedCategoryNames,
  type Locale,
} from "@/lib/i18n";
import {
  clearSupportChatSession,
  loadSupportChatSession,
  loadSupportChatThread,
  openSupportChatEventSource,
  saveSupportChatSession,
  sendSupportChatMessage,
  startSupportChat,
} from "@/lib/support-chat";

type StorefrontAppShellProps = {
  children: ReactNode;
  locale: Locale;
  cartItemCount?: number;
  authenticated?: boolean;
  supportMessageInitialName?: string;
  supportMessageInitialPhone?: string;
  supportMessageInitialEmail?: string;
  customerId?: string;
  subnav?: ReactNode;
  catalogCategories?: HeaderCatalogCategory[];
  catalogBrands?: HeaderCatalogBrand[];
};

function StorefrontAppShellInner({
  children,
  cartItemCount = 0,
  authenticated = false,
  supportMessageInitialName,
  supportMessageInitialPhone,
  supportMessageInitialEmail,
  customerId,
  subnav,
  catalogCategories = [],
  catalogBrands = [],
}: Omit<StorefrontAppShellProps, "locale">) {
  const { messages } = useLocale();
  const chromeCopy = toChromeCopy(messages);
  const localizedCategories = withLocalizedCategoryNames(
    catalogCategories,
    messages.catalog.categoryNames,
  );

  const onStart = useCallback<ChatBubbleProps["onStart"]>(
    async (input) => {
      const thread = await startSupportChat({
        ...input,
        ...(customerId === undefined ? {} : { customerId }),
      });
      return {
        id: thread.id,
        status: thread.status,
        messages: thread.messages,
        guestToken: thread.guestToken,
      };
    },
    [customerId],
  );

  const onLoadThread = useCallback(async (session: SupportChatSession) => {
    return loadSupportChatThread(session);
  }, []);

  const onSendMessage = useCallback(
    async (session: SupportChatSession, body: string) => {
      return sendSupportChatMessage(session, body);
    },
    [],
  );

  const onSubscribe = useCallback<ChatBubbleProps["onSubscribe"]>(
    (session, handlers) => {
      return openSupportChatEventSource(
        session,
        (event: SupportChatRealtimeEvent) => {
          if (event.type === "message") {
            handlers.onMessage(event.message);
            return;
          }
          if (event.type === "status") {
            handlers.onStatus(event.status);
          }
        },
      );
    },
    [],
  );

  const chatBubble: ChatBubbleProps = {
    initialName: supportMessageInitialName,
    initialPhone: supportMessageInitialPhone,
    initialEmail: supportMessageInitialEmail,
    loadSession: loadSupportChatSession,
    saveSession: saveSupportChatSession,
    clearSession: clearSupportChatSession,
    onStart,
    onLoadThread,
    onSendMessage,
    onSubscribe,
  };

  return (
    <>
      <Suspense fallback={null}>
        <ScrollToTopOnNavigate />
      </Suspense>
      <CartCompleteBarHost />
      <StorefrontShell
        cartItemCount={cartItemCount}
        authenticated={authenticated}
        languageSwitcher={<HeaderLanguageSwitcher />}
        compareLink={<HeaderCompareLink />}
        favoritesLink={<HeaderFavoritesLink />}
        accountMenu={<HeaderAccountLink authenticated={authenticated} />}
        subnav={subnav}
        catalogCategories={localizedCategories}
        catalogBrands={catalogBrands}
        chromeCopy={chromeCopy}
        chatBubble={chatBubble}
      >
        {children}
      </StorefrontShell>
    </>
  );
}

export function StorefrontAppShell({
  locale,
  ...props
}: StorefrontAppShellProps) {
  return (
    <LocaleProvider locale={locale}>
      <StorefrontAppShellInner {...props} />
    </LocaleProvider>
  );
}
