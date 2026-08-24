"use client";

import { useId, useState, type ClipboardEvent } from "react";

type BulkApplyResult = {
  appliedCount: number;
  error: string | null;
};

export function CatalogRequiredSpecsBulkPaste({
  disabled,
  onApply,
}: {
  disabled?: boolean;
  onApply: (text: string) => BulkApplyResult;
}) {
  const fieldId = useId();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<{
    error: boolean;
    message: string;
  } | null>(null);

  function applyRaw(raw: string): boolean {
    const result = onApply(raw);
    if (result.error !== null) {
      setStatus({ error: true, message: result.error });
      return false;
    }

    setText("");
    setStatus({
      error: false,
      message: `${result.appliedCount} xüsusiyyət dolduruldu.`,
    });
    return true;
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = event.clipboardData.getData("text/plain");
    if (pasted.trim() === "") {
      return;
    }

    if (applyRaw(pasted)) {
      event.preventDefault();
    }
  }

  function handleApplyClick() {
    if (text.trim() === "") {
      return;
    }
    applyRaw(text);
  }

  return (
    <div className="catalog-product-required-specs__bulk">
      <label
        className="catalog-product-required-specs__field"
        htmlFor={fieldId}
      >
        <span>Toplu yapışdır</span>
        <textarea
          id={fieldId}
          value={text}
          disabled={disabled}
          rows={4}
          spellCheck={false}
          autoComplete="off"
          placeholder={"Ekran: 6.7\"\nDaimi yaddaş: 256 GB\nMüvəqqəti yaddaş: 16 GB"}
          aria-label="Toplu xüsusiyyət mətni"
          onChange={(event) => {
            setText(event.target.value);
            if (status !== null) {
              setStatus(null);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              handleApplyClick();
            }
          }}
          onPaste={handlePaste}
        />
      </label>
      <p className="catalog-product-required-specs__bulk-hint">
        Hər sətirdə «Başlıq: Dəyər» yazın və ya Excel-dən iki sütunu yapışdırın.
        Yapışdırdıqda sətirlər avtomatik doldurulur.
      </p>
      <div className="catalog-product-required-specs__bulk-actions">
        <button
          type="button"
          className="bo-btn-reset catalog-product-required-specs__bulk-apply"
          disabled={disabled || text.trim() === ""}
          onClick={handleApplyClick}
        >
          Sətirlərə çevir
        </button>
      </div>
      {status !== null ? (
        <p
          className={
            status.error
              ? "catalog-product-required-specs__bulk-status catalog-product-required-specs__bulk-status--error"
              : "catalog-product-required-specs__bulk-status"
          }
          role={status.error ? "alert" : "status"}
        >
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
