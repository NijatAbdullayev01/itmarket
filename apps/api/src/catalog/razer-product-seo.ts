/**
 * Razer catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';
import {
  normalizeRazerSku,
  razerDisplayModel,
  type RazerNameSpec,
} from './razer-product-name';

export type RazerSeoSpec = RazerNameSpec;

export type RazerSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type RazerSeoInput = {
  sku: string;
  title: string;
  specs: readonly RazerSeoSpec[];
  subcategorySlug: string;
};

function specValue(
  specs: readonly RazerSeoSpec[],
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
  if (subcategorySlug === 'gaming-qulaqliq') {
    if (/usb/.test(hay)) {
      return 'USB oyun qulaqlığı';
    }
    if (/simsiz/.test(hay)) {
      return 'simsiz oyun qulaqlığı';
    }
    return 'oyun qulaqlığı';
  }
  const bySlug: Record<string, string> = {
    'gaming-klaviatura': /simsiz/.test(hay)
      ? 'simsiz oyun klaviaturası'
      : 'oyun klaviaturası',
    'gaming-sican': /simsiz/.test(hay) ? 'simsiz oyun siçanı' : 'oyun siçanı',
    'gaming-sican-altligi': 'siçan altlığı',
    'gaming-canta': 'oyun çantası',
    'gaming-mikrofon': 'oyun mikrofonu',
    'gaming-pult': /idarə|idare/.test(hay) ? 'idarə pulti' : 'oyun pultu',
    'gaming-dinamik': 'oyun dinamiki',
    'gaming-kreslo': 'oyun kreslosu',
  };
  return bySlug[subcategorySlug] ?? 'oyun aksesuarı';
}

function specSnippet(specs: readonly RazerSeoSpec[]): string | null {
  const preferred = [
    specValue(specs, (label) => label === 'tip'),
    specValue(specs, (label) => label === 'bağlantı' || label === 'baglanti'),
    specValue(specs, (label) => label === 'sürücü' || label === 'surucu'),
    specValue(specs, (label) => label === 'switch'),
    specValue(specs, (label) => label === 'sensor' || label === 'dpi'),
    specValue(specs, (label) => label === 'format' || label === 'forma'),
    specValue(specs, (label) => label === 'rəng' || label === 'reng'),
  ].filter((value): value is string => value !== null);
  if (preferred.length === 0) {
    return null;
  }
  return preferred.slice(0, 2).join(', ');
}

function useCase(subcategorySlug: string): string {
  if (subcategorySlug === 'gaming-qulaqliq') {
    return 'Kompüter, konsol və mobil oyun üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'gaming-klaviatura') {
    return 'Oyun və gündəlik yazı üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'gaming-sican') {
    return 'FPS və gündəlik oyun üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'gaming-mikrofon') {
    return 'Strim, Discord və səsyazma üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'gaming-pult') {
    return 'PC və konsol oyunları üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'gaming-dinamik') {
    return 'Masaüstü oyun səsi üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'gaming-kreslo') {
    return 'Uzun oyun sessiyaları üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'gaming-canta') {
    return 'Noutbuk və oyun aksesuarlarının daşınması üçündür.';
  }
  return 'Oyun və gündəlik istifadə üçün nəzərdə tutulub.';
}

function seoTitleFor(input: RazerSeoInput): string {
  const sku = normalizeRazerSku(input.sku);
  const model = razerDisplayModel(sku, input.title);
  const core =
    model === ''
      ? input.title.trim() || `Razer ${sku}`
      : `Razer ${model}`.replace(/\s+/g, ' ').trim();
  const withSku = `${core} (${sku})`.replace(/\s+/g, ' ').trim();
  if (withSku.length <= SEO_TITLE_SOFT_MAX) {
    return withSku;
  }
  if (core.length <= SEO_TITLE_SOFT_MAX) {
    return core;
  }
  const skuTitle = `Razer ${sku}`;
  if (skuTitle.length <= SEO_TITLE_SOFT_MAX) {
    return skuTitle;
  }
  return clampSeoText(core, SEO_TITLE_SOFT_MAX);
}

export function resolveRazerProductSeo(input: RazerSeoInput): RazerSeoCopy {
  const sku = normalizeRazerSku(input.sku);
  const kind = kindLabel(input.subcategorySlug, input.title);
  const snippet = specSnippet(input.specs);
  const title = input.title.trim();

  const descriptionParts = [
    `Razer ${sku}: ${snippet ?? kind}.`,
    `Orijinal Razer ${kind}, rəsmi zəmanət və çatdırılma.`,
  ];
  let seoDescription = descriptionParts.join(' ');
  if (seoDescription.length < 140) {
    seoDescription = `${seoDescription} Kataloqda orijinal model, rəsmi zəmanətlə satılır.`;
  }
  if (seoDescription.length < 140) {
    seoDescription = `${seoDescription} Razer oyun aksesuarları rəsmi zəmanətlə təqdim olunur.`;
  }

  const introBits = [
    `${title} (${sku}) orijinal Razer ${kind}dir.`,
    snippet ? `${snippet}.` : null,
    useCase(input.subcategorySlug),
    'Orijinal Razer modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  ].filter((part): part is string => part !== null);

  return {
    seoTitle: seoTitleFor(input),
    seoDescription: clampSeoText(seoDescription, SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(introBits.join(' '), 700),
  };
}

export function buildRazerProductDescription(
  pageIntro: string,
  specs: readonly RazerSeoSpec[],
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
