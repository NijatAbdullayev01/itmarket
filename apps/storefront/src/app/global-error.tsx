"use client";

import { useMemo } from "react";
import { getMessages } from "@/lib/i18n";
import { useBrowserLocale } from "@/lib/i18n/browser-locale";

/**
 * Root error UI must not depend on next/font — font loaders can break the
 * global-error module graph under Turbopack (ESM) and leave the app unrecoverable.
 */
export default function StorefrontGlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useBrowserLocale();
  const messages = useMemo(() => getMessages(locale), [locale]);

  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          fontFamily:
            'var(--font-sans, "Montserrat", system-ui, sans-serif)',
          background: "#f7f7f8",
          color: "#111827",
        }}
      >
        <div
          style={{
            maxWidth: 640,
            margin: "0 auto",
            padding: "48px 20px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              margin: "0 0 12px",
              fontSize: "1.5rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            {messages.common.criticalErrorTitle}
          </h1>
          <p style={{ margin: "0 0 24px", lineHeight: 1.5, color: "#4b5563" }}>
            {messages.common.criticalErrorDescription}
          </p>
          <button
            type="button"
            className="ui-btn"
            style={{
              appearance: "none",
              border: 0,
              borderRadius: 10,
              padding: "12px 18px",
              background: "#f97316",
              color: "#fff",
              font: "inherit",
              fontWeight: 600,
              cursor: "pointer",
            }}
            onClick={() => reset()}
          >
            {messages.common.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
