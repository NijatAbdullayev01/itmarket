/**
 * Jabra catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';
import {
  jabraDisplayModel,
  normalizeJabraSku,
  type JabraNameSpec,
} from './jabra-product-name';

export type JabraSeoSpec = JabraNameSpec;

export type JabraSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type JabraSeoInput = {
  sku: string;
  title: string;
  specs: readonly JabraSeoSpec[];
  subcategorySlug: string;
};

function specValue(
  specs: readonly JabraSeoSpec[],
  matcher: (label: string) => boolean,
): string | null {
  const found = specs.find((entry) =>
    matcher(entry.label.toLocaleLowerCase('az')),
  );
  if (found === undefined || found.value.trim() === '') {
    return null;
  }
  return found.value.trim();
}

function kindLabel(subcategorySlug: string, title: string): string {
  const hay = title.toLocaleLowerCase('az');
  if (subcategorySlug === 'qulaqliq') {
    if (/bluetooth/.test(hay)) {
      return 'Bluetooth qulaqlıq';
    }
    if (/dect/.test(hay)) {
      return 'DECT qulaqlıq';
    }
    if (/simsiz/.test(hay)) {
      return 'simsiz qulaqlıq';
    }
    return 'qulaqlıq';
  }
  const bySlug: Record<string, string> = {
    'qulaqliq-aksesuarlari': 'qulaqlıq aksesuarı',
    'konfrans-dinamiki': 'konfrans dinamiki',
    'konfrans-kamerasi': 'konfrans kamerası',
    'konfrans-kamera-aksesuarlari': 'konfrans kamera aksesuarı',
  };
  return bySlug[subcategorySlug] ?? 'Jabra məhsulu';
}

function specSnippet(specs: readonly JabraSeoSpec[]): string | null {
  const preferred = [
    specValue(specs, (label) => label === 'tip'),
    specValue(specs, (label) => label === 'forma'),
    specValue(specs, (label) => label.startsWith('bağlantı') || label === 'baglanti'),
    specValue(specs, (label) => label === 'seriya'),
    specValue(specs, (label) => label.startsWith('uyğunluq') || label === 'uygunluq'),
    specValue(specs, (label) => label.startsWith('uzunluq')),
  ].filter((value): value is string => value !== null);
  if (preferred.length === 0) {
    return null;
  }
  return preferred.slice(0, 2).join(', ');
}

function useCase(subcategorySlug: string): string {
  if (subcategorySlug === 'konfrans-kamerasi') {
    return 'Kiçik və orta meeting otaqları üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'konfrans-dinamiki') {
    return 'Ofis, hybrid iş və kiçik iclaslar üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'konfrans-kamera-aksesuarlari') {
    return 'Jabra PanaCast konfrans kamerası ilə birgə istifadə olunur.';
  }
  if (subcategorySlug === 'qulaqliq-aksesuarlari') {
    return 'Jabra ofis qulaqlıqları üçün ehtiyat hissə və aksesuardır.';
  }
  return 'Ofis, call-center və Microsoft Teams üçün nəzərdə tutulub.';
}

export function resolveJabraProductSeo(input: JabraSeoInput): JabraSeoCopy {
  const sku = normalizeJabraSku(input.sku);
  const kind = kindLabel(input.subcategorySlug, input.title);
  const model = jabraDisplayModel(input.title, input.specs);
  const snippet = specSnippet(input.specs);

  const seoTitle = clampSeoText(
    input.title.trim() || `Jabra ${model} ${kind}`,
    SEO_TITLE_SOFT_MAX,
  );

  const descriptionParts = [
    `Jabra ${model}: ${snippet ?? kind}.`,
    `Orijinal Jabra ${kind}, rəsmi zəmanət və çatdırılma.`,
  ];
  let seoDescription = descriptionParts.join(' ');
  if (seoDescription.length < 140) {
    seoDescription = `${seoDescription} Kataloqda orijinal model, rəsmi zəmanətlə satılır.`;
  }
  if (seoDescription.length < 140) {
    seoDescription = `${seoDescription} Jabra UC qulaqlıq və konfrans avadanlığı rəsmi zəmanətlə təqdim olunur.`;
  }

  const introBits = [
    `${input.title.trim()} (${sku}) orijinal Jabra ${kind}dir.`,
    snippet ? `${snippet}.` : null,
    useCase(input.subcategorySlug),
    'Orijinal Jabra modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  ].filter((part): part is string => part !== null);

  return {
    seoTitle,
    seoDescription: clampSeoText(seoDescription, SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(introBits.join(' '), 700),
  };
}

export function buildJabraProductDescription(
  pageIntro: string,
  specs: readonly JabraSeoSpec[],
): string {
  const specLines: string[] = [];
  for (const entry of specs) {
    const label = entry.label.trim();
    const value = entry.value.trim();
    if (label === '' || value === '') {
      continue;
    }
    specLines.push(`${label}: ${value}`);
  }
  if (specLines.length === 0) {
    return pageIntro.trim();
  }
  return `${pageIntro.trim()}\n\n${specLines.join('\n')}`;
}
