"use client";

import { useId, useState, type ReactNode } from "react";
import {
  CATALOG_SEO_SUGGEST_SPECS_MAX,
  type CatalogSeoSuggestRequestContract,
  type CatalogSeoSuggestResponseContract,
} from "@itmarket/contracts";

type CatalogSeoSuggestFieldsProps = {
  seoTitle: string;
  seoDescription: string;
  onSeoTitleChange: (value: string) => void;
  onSeoDescriptionChange: (value: string) => void;
  /** Landing / product body copy (form `description`). */
  pageDescription: string;
  onPageDescriptionChange: (value: string) => void;
  pageDescriptionLabel: string;
  pageDescriptionPlaceholder: string;
  pageDescriptionHint?: ReactNode;
  pageDescriptionMaxLength?: number;
  pageDescriptionRows?: number;
  /** When false, AI button is hidden (no catalog.write). */
  canSuggest: boolean;
  /** Build request from current form context; return null to block (e.g. empty name). */
  buildRequest: () => CatalogSeoSuggestRequestContract | null;
  suggestSeo: (
    input: CatalogSeoSuggestRequestContract,
  ) => Promise<CatalogSeoSuggestResponseContract>;
  titlePlaceholder: string;
  descriptionPlaceholder: string;
  titleHint?: ReactNode;
  descriptionHint?: ReactNode;
  /** Label shown in errors when the name field is empty (default: "ad"). */
  nameFieldLabel?: string;
};

export function CatalogSeoSuggestFields({
  seoTitle,
  seoDescription,
  onSeoTitleChange,
  onSeoDescriptionChange,
  pageDescription,
  onPageDescriptionChange,
  pageDescriptionLabel,
  pageDescriptionPlaceholder,
  pageDescriptionHint,
  pageDescriptionMaxLength = 5000,
  pageDescriptionRows = 6,
  canSuggest,
  buildRequest,
  suggestSeo,
  titlePlaceholder,
  descriptionPlaceholder,
  titleHint,
  descriptionHint,
  nameFieldLabel = "ad",
}: CatalogSeoSuggestFieldsProps) {
  const fieldId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  async function handleSuggest() {
    const request = buildRequest();
    if (request === null || (request.name?.trim() ?? "").length === 0) {
      setError(`AI SEO üçün əvvəlcə ${nameFieldLabel} sahəsini doldurun.`);
      setHint(null);
      return;
    }

    if (
      request.entityType === "product" &&
      (request.brandName?.trim() ?? "").length === 0
    ) {
      setError("AI SEO üçün əvvəlcə brend seçin.");
      setHint(null);
      return;
    }

    if (
      request.entityType === "product" &&
      (request.specs ?? []).filter(
        (spec) => spec.label.trim().length > 0 && spec.value.trim().length > 0,
      ).length === 0
    ) {
      const proceed = window.confirm(
        "Xüsusiyyətlər boşdur. AI daha dəqiq nəticə üçün brend, model və xüsusiyyətlərdən istifadə edir. Yenə də davam edilsin?",
      );
      if (!proceed) {
        return;
      }
    }

    const hasExisting =
      seoTitle.trim().length > 0 ||
      seoDescription.trim().length > 0 ||
      pageDescription.trim().length > 0;
    if (
      hasExisting &&
      !window.confirm(
        "Mövcud SEO / səhifə mətni sahələri doludur. AI təklifi ilə əvəz olunsun?",
      )
    ) {
      return;
    }

    setPending(true);
    setError(null);
    setHint(null);
    try {
      const result = await suggestSeo({
        ...request,
        name: request.name.trim(),
        specs: (request.specs ?? [])
          .filter(
            (spec) => spec.label.trim().length > 0 && spec.value.trim().length > 0,
          )
          .slice(0, CATALOG_SEO_SUGGEST_SPECS_MAX),
      });
      onSeoTitleChange(result.seoTitle);
      onSeoDescriptionChange(result.seoDescription);
      onPageDescriptionChange(result.description);
      const sourceLabel =
        result.source === "llm" ? "LLM təklifi" : "Qayda əsaslı təklif";
      const warningText =
        result.warnings.length > 0 ? ` ${result.warnings.join(" ")}` : "";
      setHint(`${sourceLabel} tətbiq olundu.${warningText}`);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "SEO təklifi alınmadı";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="catalog-seo-suggest">
      <div className="catalog-seo-suggest__toolbar">
        <p className="catalog-seo-suggest__label">SEO və səhifə mətni</p>
        {canSuggest ? (
          <button
            type="button"
            className="catalog-seo-suggest__button"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void handleSuggest();
            }}
          >
            {pending ? "Yazılır…" : "AI ilə SEO yaz"}
          </button>
        ) : null}
      </div>

      <label
        className="catalog-subcategories-form__field catalog-subcategories-form__field--wide"
        htmlFor={`${fieldId}-seo-title`}
      >
        <span>SEO başlıq</span>
        <input
          id={`${fieldId}-seo-title`}
          name="seoTitle"
          maxLength={160}
          value={seoTitle}
          placeholder={titlePlaceholder}
          onChange={(event) => onSeoTitleChange(event.target.value)}
        />
        {titleHint !== undefined ? (
          <p className="catalog-subcategories-form__field-hint">{titleHint}</p>
        ) : null}
      </label>

      <label
        className="catalog-subcategories-form__field catalog-subcategories-form__field--wide"
        htmlFor={`${fieldId}-seo-description`}
      >
        <span>SEO təsvir</span>
        <textarea
          id={`${fieldId}-seo-description`}
          name="seoDescription"
          rows={3}
          maxLength={300}
          value={seoDescription}
          placeholder={descriptionPlaceholder}
          onChange={(event) => onSeoDescriptionChange(event.target.value)}
        />
        {descriptionHint !== undefined ? (
          <p className="catalog-subcategories-form__field-hint">
            {descriptionHint}
          </p>
        ) : null}
      </label>

      <label
        className="catalog-subcategories-form__field catalog-subcategories-form__field--wide"
        htmlFor={`${fieldId}-page-description`}
      >
        <span>{pageDescriptionLabel}</span>
        <textarea
          id={`${fieldId}-page-description`}
          name="description"
          rows={pageDescriptionRows}
          maxLength={pageDescriptionMaxLength}
          value={pageDescription}
          placeholder={pageDescriptionPlaceholder}
          onChange={(event) => onPageDescriptionChange(event.target.value)}
        />
        {pageDescriptionHint !== undefined ? (
          <p className="catalog-subcategories-form__field-hint">
            {pageDescriptionHint}
          </p>
        ) : null}
      </label>

      {error !== null ? (
        <p className="catalog-seo-suggest__error" role="alert">
          {error}
        </p>
      ) : null}
      {hint !== null && error === null ? (
        <p className="catalog-seo-suggest__hint" role="status">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
