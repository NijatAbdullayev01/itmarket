"use client";

import type {
  CatalogPriceImportResponseContract,
  CatalogPriceImportRowResultContract,
} from "@itmarket/contracts";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  downloadProductPriceImportTemplate,
  parseProductPriceImportFile,
  type ProductPriceImportParsedRow,
} from "../../lib/product-price-import";
import { formatAznValue } from "../../lib/format-azn";

type CatalogPriceImportDialogProps = {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onDryRun: (
    items: ProductPriceImportParsedRow[],
  ) => Promise<CatalogPriceImportResponseContract>;
  onApply: (
    items: ProductPriceImportParsedRow[],
  ) => Promise<CatalogPriceImportResponseContract>;
};

type DialogPhase = "pick" | "preview" | "result";

function statusLabel(status: CatalogPriceImportRowResultContract["status"]) {
  switch (status) {
    case "updated":
      return "Yenilənəcək";
    case "unchanged":
      return "Eyni";
    case "not_found":
      return "Tapılmadı";
    case "ambiguous":
      return "Qeyri-müəyyən";
    case "invalid":
      return "Yanlış";
    case "no_variants":
      return "SKU yoxdur";
    default:
      return status;
  }
}

function statusClass(status: CatalogPriceImportRowResultContract["status"]) {
  switch (status) {
    case "updated":
      return "is-ok";
    case "unchanged":
      return "is-muted";
    default:
      return "is-warn";
  }
}

export function CatalogPriceImportDialog({
  open,
  pending,
  onClose,
  onDryRun,
  onApply,
}: CatalogPriceImportDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<DialogPhase>("pick");
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<ProductPriceImportParsedRow[]>(
    [],
  );
  const [preview, setPreview] =
    useState<CatalogPriceImportResponseContract | null>(null);
  const [result, setResult] =
    useState<CatalogPriceImportResponseContract | null>(null);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setPhase("pick");
    setParseErrors([]);
    setParsedRows([]);
    setPreview(null);
    setResult(null);
    setBusyLabel(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending && busyLabel === null) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, pending, busyLabel, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const isBusy = pending || busyLabel !== null;

  async function handleFileChange(file: File | null) {
    if (file === null) {
      return;
    }
    setBusyLabel("Fayl oxunur…");
    setParseErrors([]);
    setPreview(null);
    setResult(null);
    try {
      const parsed = await parseProductPriceImportFile(file);
      if (parsed.rows.length === 0) {
        setParsedRows([]);
        setParseErrors(
          parsed.errors.length > 0
            ? parsed.errors
            : ["Yenilənəcək qiymət sətiri tapılmadı"],
        );
        setPhase("pick");
        return;
      }
      setParsedRows(parsed.rows);
      setParseErrors(parsed.errors);
      setBusyLabel("Uyğunluq yoxlanılır…");
      const dryRun = await onDryRun(parsed.rows);
      setPreview(dryRun);
      setPhase("preview");
    } catch (error) {
      setParseErrors([
        error instanceof Error
          ? error.message
          : "Excel faylı oxunarkən xəta baş verdi",
      ]);
      setPhase("pick");
    } finally {
      setBusyLabel(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleApply() {
    if (parsedRows.length === 0) {
      return;
    }
    setBusyLabel("Qiymətlər yenilənir…");
    try {
      const applied = await onApply(parsedRows);
      setResult(applied);
      setPhase("result");
    } catch (error) {
      setParseErrors([
        error instanceof Error
          ? error.message
          : "Qiymətlər yenilənərkən xəta baş verdi",
      ]);
    } finally {
      setBusyLabel(null);
    }
  }

  const activeReport = phase === "result" ? result : preview;
  const canApply =
    phase === "preview" &&
    preview !== null &&
    preview.summary.updated > 0 &&
    !isBusy;

  return createPortal(
    <div className="ui-modal" role="presentation">
      <button
        type="button"
        className="ui-modal__backdrop"
        aria-label="Bağla"
        disabled={isBusy}
        onClick={() => {
          if (!isBusy) {
            onClose();
          }
        }}
      />
      <div
        className="ui-modal__dialog catalog-price-import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header className="catalog-price-import-dialog__header">
          <h2 className="catalog-price-import-dialog__title" id={titleId}>
            Excel ilə qiymət yenilə
          </h2>
          <p className="catalog-price-import-dialog__message" id={descriptionId}>
            Brend və modelə görə qiymətləri oxuyub bütün SKU variantlarına
            tətbiq edir. Əvvəlcə önbaxış, sonra təsdiq.
          </p>
        </header>

        <div className="catalog-price-import-dialog__body">
          {phase === "pick" ? (
            <div className="catalog-price-import-dialog__pick">
              <ol className="catalog-price-import-dialog__steps">
                <li>
                  Şablonu endirin və <strong>Brend</strong>,{" "}
                  <strong>Model</strong>, <strong>Qiymət (AZN)</strong>{" "}
                  sütunlarını doldurun.
                </li>
                <li>
                  Eyni brend/modelin bütün SKU-larına eyni qiymət yazılır.
                </li>
                <li>
                  İstəyə görə <strong>Əvvəlki qiymət</strong> sütunu endirim
                  üçün istifadə olunur.
                </li>
              </ol>
              <div className="catalog-price-import-dialog__pick-actions">
                <button
                  type="button"
                  className="catalog-subcategories-form__cancel"
                  disabled={isBusy}
                  onClick={() => {
                    void downloadProductPriceImportTemplate();
                  }}
                >
                  Şablonu endir
                </button>
                <button
                  type="button"
                  className="catalog-subcategories-form__submit"
                  disabled={isBusy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {busyLabel ?? "Excel seç"}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  void handleFileChange(file);
                }}
              />
            </div>
          ) : null}

          {parseErrors.length > 0 ? (
            <ul className="catalog-price-import-dialog__errors" role="alert">
              {parseErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}

          {activeReport !== null ? (
            <>
              <div
                className="catalog-price-import-dialog__summary"
                aria-label="Nəticə xülasəsi"
              >
                <div>
                  <span>Yenilənəcək</span>
                  <strong>{activeReport.summary.updated}</strong>
                </div>
                <div>
                  <span>Eyni</span>
                  <strong>{activeReport.summary.unchanged}</strong>
                </div>
                <div>
                  <span>Tapılmadı</span>
                  <strong>{activeReport.summary.notFound}</strong>
                </div>
                <div>
                  <span>Digər</span>
                  <strong>
                    {activeReport.summary.ambiguous +
                      activeReport.summary.invalid +
                      activeReport.summary.noVariants}
                  </strong>
                </div>
              </div>

              <div className="catalog-price-import-dialog__table-wrap">
                <table className="catalog-price-import-dialog__table">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Brend</th>
                      <th scope="col">Model</th>
                      <th scope="col">Qiymət</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeReport.rows.map((row) => (
                      <tr key={`${row.rowNumber}-${row.brand}-${row.model}`}>
                        <td>{row.rowNumber}</td>
                        <td>{row.brand}</td>
                        <td>{row.model}</td>
                        <td>
                          {formatAznValue(row.price) ?? row.price}
                          {row.previousPrice !== null
                            ? ` / əvvəl ${formatAznValue(row.previousPrice) ?? row.previousPrice}`
                            : ""}
                        </td>
                        <td>
                          <span
                            className={`catalog-price-import-dialog__badge ${statusClass(row.status)}`}
                            title={row.message ?? undefined}
                          >
                            {phase === "result" && row.status === "updated"
                              ? "Yeniləndi"
                              : statusLabel(row.status)}
                            {row.updatedCount > 1
                              ? ` · ${row.updatedCount} SKU`
                              : ""}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>

        <footer className="catalog-price-import-dialog__footer">
          {phase === "result" ? (
            <button
              type="button"
              className="catalog-subcategories-form__submit"
              onClick={onClose}
            >
              Bağla
            </button>
          ) : (
            <>
              <button
                type="button"
                className="catalog-subcategories-form__cancel"
                disabled={isBusy}
                onClick={onClose}
              >
                Ləğv et
              </button>
              {phase === "preview" ? (
                <button
                  type="button"
                  className="catalog-subcategories-form__submit"
                  disabled={!canApply}
                  onClick={() => {
                    void handleApply();
                  }}
                >
                  {busyLabel ??
                    `Qiymətləri yenilə (${preview?.summary.updated ?? 0})`}
                </button>
              ) : null}
            </>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
