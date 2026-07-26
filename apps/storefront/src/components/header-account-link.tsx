"use client";

import { HeaderAccountLink as UiHeaderAccountLink } from "@itmarket/ui";
import { useLocale } from "@/components/locale-provider";

export function HeaderAccountLink({
  authenticated = false,
}: {
  authenticated?: boolean;
}) {
  const { messages } = useLocale();

  return (
    <UiHeaderAccountLink
      authenticated={authenticated}
      signInLabel={messages.header.signIn}
      accountLabel={messages.header.account}
    />
  );
}
