"use client";

import { useMemo } from "react";
import { getMessages } from "@/lib/i18n";
import { useBrowserLocale } from "@/lib/i18n/browser-locale";

export default function StorefrontError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useBrowserLocale();
  const messages = useMemo(() => getMessages(locale), [locale]);

  return (
    <div className="ui-container">
      <div className="ui-empty-state">
        <h1 className="ui-empty-state__title">{messages.common.errorTitle}</h1>
        <p className="ui-empty-state__body">
          {messages.common.errorDescription}
        </p>
        <button
          type="button"
          className="ui-btn ui-empty-state__action"
          onClick={() => reset()}
        >
          {messages.common.retry}
        </button>
      </div>
    </div>
  );
}
