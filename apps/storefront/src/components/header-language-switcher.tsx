"use client";

import { useEffect, useId, useRef, useState } from "react";

import { IconChevronDown } from "@itmarket/ui";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { useLocale } from "@/components/locale-provider";

export function HeaderLanguageSwitcher() {
  const { locale, messages, setLocale, isPending } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const otherLocales = LOCALES.filter((code) => code !== locale);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (
        rootRef.current !== null &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selectLocale = (code: Locale) => {
    setOpen(false);
    setLocale(code);
  };

  return (
    <div
      ref={rootRef}
      className={
        open ? "ui-header-language is-open" : "ui-header-language"
      }
      data-pending={isPending ? "true" : undefined}
    >
      <button
        type="button"
        className="ui-header-language__trigger"
        aria-label={messages.header.languageAria}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={isPending}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="ui-header-language__code">
          {LOCALE_LABELS[locale]}
        </span>
        <IconChevronDown
          className="ui-header-language__chevron"
          width={14}
          height={14}
        />
      </button>

      {open ? (
        <ul
          id={listId}
          className="ui-header-language__menu"
          role="listbox"
          aria-label={messages.header.languageAria}
        >
          {otherLocales.map((code) => (
            <li key={code} role="presentation">
              <button
                type="button"
                className="ui-header-language__option"
                role="option"
                aria-selected={false}
                onClick={() => selectLocale(code)}
              >
                {LOCALE_LABELS[code]}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
