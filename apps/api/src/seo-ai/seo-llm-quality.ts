import type { SeoLlmSafePayload } from './seo-ai-boundary';
import {
  clampSeoText,
  PAGE_DESCRIPTION_SOFT_MAX,
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from './seo-heuristic';

export type SeoLlmRawFields = {
  seoTitle: string;
  seoDescription: string;
  description: string;
};

export type RefinedSeoLlmFields = SeoLlmRawFields & {
  warnings: string[];
};

const SITE_SUFFIX =
  /\s*[|\-–—]\s*IT\s*Market\s*$/iu;
const REPEATED_WHITESPACE = /\s+/g;
/** Avoid \\b — it breaks on Azerbaijani letters (ə, ı, ş, …). */
const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/giu;

function collapseWhitespace(value: string): string {
  return value.replace(REPEATED_WHITESPACE, ' ').trim();
}

function stripSiteSuffix(value: string): string {
  let current = collapseWhitespace(value);
  // Layout already appends " | IT Market" — strip model leftovers.
  for (let i = 0; i < 3; i += 1) {
    const next = current.replace(SITE_SUFFIX, '').trim();
    if (next === current) {
      break;
    }
    current = next;
  }
  return current;
}

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('«') && trimmed.endsWith('»'))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function stripPricePromises(value: string): string {
  return collapseWhitespace(value.replace(PRICE_PROMISE, '').replace(/^\s*ilə\s+/iu, ''));
}

/** Prefer cutting on a word boundary before soft SERP limit. */
export function softClampSeoText(value: string, softMax: number): string {
  const normalized = collapseWhitespace(value);
  if (normalized.length <= softMax) {
    return normalized;
  }
  const window = normalized.slice(0, softMax);
  const lastSpace = window.lastIndexOf(' ');
  const cutAt =
    lastSpace >= Math.floor(softMax * 0.6) ? lastSpace : softMax - 1;
  return `${window.slice(0, cutAt).trimEnd()}…`;
}

function includesInsensitive(haystack: string, needle: string): boolean {
  if (needle.trim().length === 0) {
    return true;
  }
  return haystack.toLocaleLowerCase('az').includes(needle.toLocaleLowerCase('az'));
}

function pickPrimarySpecValues(payload: SeoLlmSafePayload): string[] {
  const preferred = [
    'daimi yaddaş',
    'yaddaş',
    'storage',
    'ram',
    'müvəqqəti yaddaş',
  ];
  const values: string[] = [];
  for (const needle of preferred) {
    for (const spec of payload.specs) {
      const label = spec.label.toLocaleLowerCase('az');
      if (!label.includes(needle)) {
        continue;
      }
      if (
        !values.some(
          (entry) =>
            entry.toLocaleLowerCase('az') === spec.value.toLocaleLowerCase('az'),
        )
      ) {
        values.push(spec.value);
      }
    }
  }
  return values.slice(0, 2);
}

/**
 * Entity-aware writing brief for the LLM system prompt.
 * Keeps outbound user JSON allowlisted; extra guidance lives only in prompts.
 */
export function buildSeoLlmBrief(payload: SeoLlmSafePayload): string {
  const specsLine =
    payload.specs.length > 0
      ? payload.specs.map((spec) => `${spec.label}: ${spec.value}`).join('; ')
      : 'yoxdur';
  const primarySpecs = pickPrimarySpecValues(payload);

  switch (payload.entityType) {
    case 'product':
      return [
        'Entity: məhsul (SKU / model).',
        `Brend: ${payload.brand ?? 'naməlum'}; model: ${payload.model}.`,
        `Kateqoriya: ${payload.category ?? '—'}; ana kateqoriya: ${payload.parentCategory ?? '—'}.`,
        `Xüsusiyyətlər: ${specsLine}.`,
        primarySpecs.length > 0
          ? `seoTitle-də brend + model + əsas spek (${primarySpecs.join(', ')}) olsun; spekdə olmayan dəyər uydurma.`
          : 'seoTitle-də brend + model olsun; spekdə olmayan dəyər uydurma.',
        'seoDescription: CTR üçün faydalar (orijinal, zəmanət, çatdırılma) — qiymət/endirim vədi yazma.',
        'description: 3–6 cümləlik ətraflı vitrin mətni; modelin kimə uyğun olduğunu, əsas faydaları və IT Market üstünlüklərini yaz; spekdə olmayan fakt uydurma.',
      ].join(' ');
    case 'brand':
      return [
        'Entity: brend landinq.',
        `Brend: ${payload.model}.`,
        'seoTitle: qısa brend adı + yüngül kommersiya siqnalı (məs. məhsulları / kataloqu) — spam etmə.',
        'seoDescription: brendin IT Market-dəki seçimini qısa təqdim et.',
        'description: 3–5 cümləlik landinq intro; uydurma seriya/model adı yazma.',
      ].join(' ');
    case 'category':
      return [
        'Entity: kateqoriya landinq.',
        `Kateqoriya: ${payload.model}.`,
        'seoTitle: kateqoriya adı + «kataloqu» və ya oxşar təbii ifadə.',
        'seoDescription: alış intent (müqayisə, seçim, zəmanət, çatdırılma); konkret SKU uydurma.',
        'description: 3–5 cümləlik landinq intro; konkret SKU uydurma.',
      ].join(' ');
    case 'subcategory':
      return [
        'Entity: alt kateqoriya landinq.',
        `Alt kateqoriya: ${payload.model}; ana kateqoriya: ${payload.parentCategory ?? '—'}.`,
        'seoTitle-də alt kateqoriya adı dominant olsun; ana kateqoriyanı lazım olsa qısaca əlavə et.',
        'seoDescription: ana + alt kontekstini qısa birləşdir; konkret SKU uydurma.',
        'description: 3–5 cümləlik landinq intro; konkret SKU uydurma.',
      ].join(' ');
    default: {
      const _exhaustive: never = payload.entityType;
      throw new Error(`Unsupported SEO entity: ${String(_exhaustive)}`);
    }
  }
}

export function buildSeoLlmSystemPrompt(payload: SeoLlmSafePayload): string {
  return [
    'Sən IT Market (Azərbaycan e-commerce) üçün kataloq SEO mütəxəssisisən.',
    'Yalnız bu 3 sahəni yaz: seoTitle, seoDescription, description.',
    'Çıxış: tək JSON obyekti — {"seoTitle":"...","seoDescription":"...","description":"..."}.',
    `seoTitle: ${Math.max(40, SEO_TITLE_SOFT_MAX - 10)}–${SEO_TITLE_SOFT_MAX} simvol; " | IT Market" əlavə etmə (şablon əlavə edir).`,
    `seoDescription: ${Math.max(110, SEO_DESCRIPTION_SOFT_MAX - 25)}–${SEO_DESCRIPTION_SOFT_MAX} simvol; meta description.`,
    `description: ${Math.max(320, PAGE_DESCRIPTION_SOFT_MAX - 400)}–${PAGE_DESCRIPTION_SOFT_MAX} simvol; ətraflı landinq/məhsul mətni (meta deyil).`,
    'Dil: Azərbaycan; təbii, konkret, keyword stuffing yox.',
    'Qadağan: ödəniş/kart/IBAN/CVV, sifariş, müştəri PII, email, telefon, ünvan, FIN, şifrə, token, stok/qiymət vədi, uydurma texniki iddia.',
    'Girişdə həssas məlumat görsən, təkrarlama.',
    buildSeoLlmBrief(payload),
  ].join(' ');
}

export function buildSeoLlmUserPrompt(payloadJson: string): string {
  return [
    'Aşağıdakı kataloq kontekstinə əsasən SEO JSON yaz.',
    'Yalnız verilən brand/model/category/specs/existingDescription-dan istifadə et; yeni fakt uydurma.',
    'Mövcud description varsa, onu təkmilləşdirib yenidən yaz (köçürmə).',
    '',
    'Kataloq konteksti:',
    payloadJson,
  ].join('\n');
}

/**
 * Post-process LLM SEO copy for SERP quality and storefront title template safety.
 */
export function refineLlmSeoSuggestion(
  raw: SeoLlmRawFields,
  payload: SeoLlmSafePayload,
): RefinedSeoLlmFields {
  const warnings: string[] = [];

  let seoTitle = softClampSeoText(
    stripSiteSuffix(stripWrappingQuotes(raw.seoTitle)),
    SEO_TITLE_SOFT_MAX,
  );
  let seoDescription = softClampSeoText(
    stripPricePromises(stripSiteSuffix(stripWrappingQuotes(raw.seoDescription))),
    SEO_DESCRIPTION_SOFT_MAX,
  );
  let description = softClampSeoText(
    stripPricePromises(stripSiteSuffix(stripWrappingQuotes(raw.description))),
    PAGE_DESCRIPTION_SOFT_MAX,
  );

  seoTitle = collapseWhitespace(seoTitle);
  seoDescription = collapseWhitespace(seoDescription);
  description = collapseWhitespace(description);

  if (payload.entityType === 'product' && payload.brand) {
    if (!includesInsensitive(seoTitle, payload.brand)) {
      const prefixed = softClampSeoText(
        `${payload.brand} ${seoTitle}`,
        SEO_TITLE_SOFT_MAX,
      );
      if (includesInsensitive(prefixed, payload.brand)) {
        seoTitle = prefixed;
        warnings.push('SEO başlığına brend əlavə olundu.');
      }
    }
    if (!includesInsensitive(seoTitle, payload.model.split(/\s+/)[0] ?? '')) {
      // Model token often already present via brand+name; only warn when fully absent.
      const modelToken = payload.model.trim().split(/\s+/)[0] ?? '';
      if (
        modelToken.length >= 3 &&
        !includesInsensitive(seoTitle, modelToken)
      ) {
        warnings.push('SEO başlığında model adı zəif görünür — yoxlayın.');
      }
    }
  }

  if (SITE_SUFFIX.test(raw.seoTitle) || SITE_SUFFIX.test(raw.seoDescription)) {
    warnings.push('" | IT Market" suffiksi çıxarıldı (şablon artıq əlavə edir).');
  }
  if (raw.seoTitle.trim().length > SEO_TITLE_SOFT_MAX) {
    warnings.push('SEO başlığı SERP limiti üçün qısaldıldı.');
  }
  if (raw.seoDescription.trim().length > SEO_DESCRIPTION_SOFT_MAX) {
    warnings.push('SEO təsviri SERP limiti üçün qısaldıldı.');
  }
  if (raw.description.trim().length > PAGE_DESCRIPTION_SOFT_MAX) {
    warnings.push('Səhifə mətni qısaldıldı.');
  }

  // Final safety clamp (hard caps live in the client after refine).
  return {
    seoTitle: clampSeoText(seoTitle, SEO_TITLE_SOFT_MAX),
    seoDescription: clampSeoText(seoDescription, SEO_DESCRIPTION_SOFT_MAX),
    description: clampSeoText(description, PAGE_DESCRIPTION_SOFT_MAX),
    warnings,
  };
}
