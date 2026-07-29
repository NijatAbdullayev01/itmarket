import { BadRequestException } from '@nestjs/common';
import type {
  CatalogSeoEntityType,
  CatalogSeoSuggestRequestContract,
  CatalogSeoSuggestSpec,
} from '@itmarket/contracts';

/**
 * Trust boundary for external SEO LLM calls.
 *
 * - Only allowlisted catalog marketing fields may leave the API toward a provider.
 * - Payment, order, customer, session, and staff PII must never be injected here
 *   (this module must not import Prisma / Payments / Orders / Customers).
 * - High-confidence PII or payment patterns in free text are rejected before egress.
 */

/** Exact keys permitted in the outbound LLM user payload (JSON). */
export const SEO_LLM_ALLOWED_PAYLOAD_KEYS = [
  'entityType',
  'brand',
  'model',
  'category',
  'parentCategory',
  'specs',
  'existingDescription',
] as const;

export type SeoLlmSafePayload = {
  entityType: CatalogSeoEntityType;
  brand: string | null;
  model: string;
  category: string | null;
  parentCategory: string | null;
  specs: Array<{ label: string; value: string }>;
  existingDescription: string | null;
};

const SENSITIVE_SPEC_LABEL =
  /^(e-?mail|email|telefon|phone|mobile|ünvan|address|fin|fin.?kod|kart|card|cvv|cvc|pan|iban|password|şifrə|parol|müştəri|customer|user.?id|order.?id|ödəniş|payment|refund|session|token|secret)$/i;

/** High-confidence patterns that must not egress to an external LLM. */
const SENSITIVE_TEXT_PATTERNS: ReadonlyArray<{ name: string; pattern: RegExp }> =
  [
    {
      name: 'email',
      pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    },
    {
      name: 'az-phone',
      // Require +994… or a leading 0 that is not mid-digit (avoids EAN/IMEI).
      pattern:
        /(?:\+994|(?<!\d)0)\s*\(?\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/,
    },
    {
      // Exactly 16 digits (4×4). Avoids IMEI (15) / EAN-13 barcode false positives.
      name: 'payment-card',
      pattern: /\b(?:\d{4}[ -]?){3}\d{4}\b/,
    },
    {
      name: 'iban',
      pattern: /\bAZ\d{2}[A-Z0-9]{20}\b/i,
    },
    {
      name: 'cvv-context',
      pattern: /\b(?:cvv|cvc|cvc2|security.?code)\s*[:=]?\s*\d{3,4}\b/i,
    },
    {
      name: 'fin-context',
      pattern: /\b(?:fin|fincode|fin.?kod)\s*[:=]?\s*[A-Z0-9]{7}\b/i,
    },
  ];

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function collectTextFragments(payload: SeoLlmSafePayload): string[] {
  const fragments: string[] = [payload.model];
  if (payload.brand !== null) {
    fragments.push(payload.brand);
  }
  if (payload.category !== null) {
    fragments.push(payload.category);
  }
  if (payload.parentCategory !== null) {
    fragments.push(payload.parentCategory);
  }
  if (payload.existingDescription !== null) {
    fragments.push(payload.existingDescription);
  }
  for (const spec of payload.specs) {
    fragments.push(spec.label, spec.value);
  }
  return fragments;
}

function assertNoSensitiveContent(payload: SeoLlmSafePayload): void {
  for (const spec of payload.specs) {
    if (SENSITIVE_SPEC_LABEL.test(spec.label.trim())) {
      throw new BadRequestException(
        'SEO AI yalnız kataloq marketinq sahələrini qəbul edir; şəxsi / ödəniş sahələri göndərilə bilməz.',
      );
    }
  }

  for (const fragment of collectTextFragments(payload)) {
    for (const { pattern } of SENSITIVE_TEXT_PATTERNS) {
      if (pattern.test(fragment)) {
        throw new BadRequestException(
          'SEO AI sorğusunda şəxsi və ya ödəniş məlumatı aşkarlandı. Yalnız məhsul/kateqoriya/brend SEO mətni göndərin.',
        );
      }
    }
  }
}

function normalizeSpecs(
  specs: CatalogSeoSuggestSpec[] | undefined,
): Array<{ label: string; value: string }> {
  return (specs ?? [])
    .map((spec) => ({
      label: collapseWhitespace(spec.label ?? ''),
      value: collapseWhitespace(spec.value ?? ''),
    }))
    .filter((spec) => spec.label.length > 0 && spec.value.length > 0)
    .slice(0, 12);
}

/**
 * Build the only payload shape that may be sent to an external SEO LLM.
 * Drops every non-allowlisted field from the inbound DTO.
 */
export function buildSeoLlmSafePayload(
  input: CatalogSeoSuggestRequestContract,
): SeoLlmSafePayload {
  const payload: SeoLlmSafePayload = {
    entityType: input.entityType,
    brand: input.brandName ? collapseWhitespace(input.brandName) || null : null,
    model: collapseWhitespace(input.name),
    category: input.categoryName
      ? collapseWhitespace(input.categoryName) || null
      : null,
    parentCategory: input.parentCategoryName
      ? collapseWhitespace(input.parentCategoryName) || null
      : null,
    specs: normalizeSpecs(input.specs),
    existingDescription: input.description
      ? collapseWhitespace(input.description) || null
      : null,
  };

  if (payload.model.length === 0) {
    throw new BadRequestException('SEO təklifi üçün ad tələb olunur');
  }

  assertNoSensitiveContent(payload);
  return payload;
}

/** Runtime guard: outbound JSON must contain only allowlisted keys. */
export function assertSeoLlmPayloadKeys(
  payload: Record<string, unknown>,
): void {
  const allowed = new Set<string>(SEO_LLM_ALLOWED_PAYLOAD_KEYS);
  for (const key of Object.keys(payload)) {
    if (!allowed.has(key)) {
      throw new BadRequestException(
        'SEO AI outbound payload allowlist pozuldu',
      );
    }
  }
}
