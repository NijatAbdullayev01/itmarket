/**
 * 2E / 2E Gaming catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';
import {
  normalizeTwoESku,
  twoeDisplayModel,
  type TwoENameSpec,
} from './twoe-product-name';

export type TwoESeoSpec = TwoENameSpec;

export type TwoESeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type TwoESeoInput = {
  sku: string;
  title: string;
  specs: readonly TwoESeoSpec[];
  subcategorySlug: string;
};

function specValue(
  specs: readonly TwoESeoSpec[],
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
  const bySlug: Record<string, string> = {
    sican: /simsiz/.test(hay) ? 'simsiz siçan' : 'siçan',
    klaviatura: /simsiz/.test(hay) ? 'simsiz klaviatura' : 'klaviatura',
    'klaviatura-ve-sican-desti': 'klaviatura və siçan dəsti',
    'usb-hub': 'USB hub',
    'elektrik-uzadici': 'elektrik uzadıcı',
    'temizlik-desti': 'təmizlik dəsti',
    korpus: 'PC korpusu',
    'gaming-sican': /simsiz/.test(hay) ? 'simsiz oyun siçanı' : 'oyun siçanı',
    'gaming-klaviatura': 'oyun klaviaturası',
    'gaming-qulaqliq': 'oyun qulaqlığı',
    'gaming-sican-altligi': 'oyun siçan altlığı',
    'gaming-dinamik': 'oyun dinamiki',
    'gaming-kreslo': 'oyun kreslosu',
    'gaming-mikrofon': 'oyun mikrofonu',
    'gaming-monitor': 'oyun monitoru',
    'gaming-masa': 'oyun masası',
    'gaming-lampa': 'monitor lampası',
    'gaming-eynek': 'oyun eynəyi',
    'gpu-dayaq': 'GPU dayağı',
    monitor: 'monitor',
    'monitor-stendi': 'monitor stendi',
    'noutbuk-cantasi': 'noutbuk çantası',
    'noutbuk-aksesuarlari': 'noutbuk dayağı',
    mikrofon: 'mikrofon',
    'portativ-kolonka': 'portativ kolonka',
    qulaqliq: 'qulaqlıq',
    'tv-tutacagi': 'TV tutacağı',
    televizor: 'televizor',
    'kagiz-dograyan': 'kağız doğrayan',
    'agilli-lampa': 'masa lampası',
    'line-interactive': 'UPS',
  };
  return bySlug[subcategorySlug] ?? 'aksesuar';
}

function specSnippet(specs: readonly TwoESeoSpec[]): string | null {
  const preferred = [
    specValue(specs, (label) => label === 'tip'),
    specValue(specs, (label) => label === 'bağlantı' || label === 'baglanti'),
    specValue(specs, (label) => label === 'interfeys' || label === 'interface'),
    specValue(specs, (label) => label === 'dpi'),
    specValue(specs, (label) => label === 'diaqonal'),
    specValue(specs, (label) => label === 'güc' || label === 'guc'),
    specValue(specs, (label) => label === 'rəng' || label === 'reng'),
  ].filter((value): value is string => value !== null);
  if (preferred.length === 0) {
    return null;
  }
  return preferred.slice(0, 2).join(', ');
}

function useCase(subcategorySlug: string): string {
  if (subcategorySlug === 'gaming-qulaqliq' || subcategorySlug === 'qulaqliq') {
    return 'Oyun, zəng və gündəlik dinləmə üçün nəzərdə tutulub.';
  }
  if (
    subcategorySlug === 'gaming-klaviatura' ||
    subcategorySlug === 'klaviatura'
  ) {
    return 'Oyun və gündəlik yazı üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'gaming-sican' || subcategorySlug === 'sican') {
    return 'Ofis və oyun üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'gaming-kreslo') {
    return 'Uzun oyun sessiyaları üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'portativ-kolonka') {
    return 'Ev, ofis və açıq hava üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'line-interactive') {
    return 'Kompüter və ofis avadanlığının qısa fasilələrdə qorunması üçündür.';
  }
  if (subcategorySlug === 'monitor' || subcategorySlug === 'gaming-monitor') {
    return 'İş və əyləncə üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'noutbuk-cantasi') {
    return 'Noutbukun daşınması və qorunması üçündür.';
  }
  return 'Gündəlik istifadə üçün nəzərdə tutulub.';
}

function seoTitleFor(input: TwoESeoInput): string {
  const sku = normalizeTwoESku(input.sku);
  const model = twoeDisplayModel(sku, input.title);
  const brandPrefix = /^2e\s+gaming\b/i.test(input.title) ? '2E Gaming' : '2E';
  const core =
    model === ''
      ? input.title.trim() || `${brandPrefix} ${sku}`
      : `${brandPrefix} ${model}`.replace(/\s+/g, ' ').trim();
  const withSku = `${core} (${sku})`.replace(/\s+/g, ' ').trim();
  if (withSku.length <= SEO_TITLE_SOFT_MAX) {
    return withSku;
  }
  if (core.length <= SEO_TITLE_SOFT_MAX) {
    return core;
  }
  const skuTitle = `${brandPrefix} ${sku}`;
  if (skuTitle.length <= SEO_TITLE_SOFT_MAX) {
    return skuTitle;
  }
  return clampSeoText(core, SEO_TITLE_SOFT_MAX);
}

export function resolveTwoEProductSeo(input: TwoESeoInput): TwoESeoCopy {
  const sku = normalizeTwoESku(input.sku);
  const kind = kindLabel(input.subcategorySlug, input.title);
  const snippet = specSnippet(input.specs);
  const title = input.title.trim();
  const brandLabel = /^2e\s+gaming\b/i.test(title) ? '2E Gaming' : '2E';

  const descriptionParts = [
    `${brandLabel} ${sku}: ${snippet ?? kind}.`,
    `Orijinal ${brandLabel} ${kind}, rəsmi zəmanət və çatdırılma.`,
  ];
  let seoDescription = descriptionParts.join(' ');
  if (seoDescription.length < 140) {
    seoDescription = `${seoDescription} Kataloqda orijinal model, rəsmi zəmanətlə satılır.`;
  }
  if (seoDescription.length < 140) {
    seoDescription = `${seoDescription} 2E məhsulları rəsmi zəmanətlə təqdim olunur.`;
  }

  const introBits = [
    `${title} (${sku}) orijinal ${brandLabel} ${kind}dir.`,
    snippet ? `${snippet}.` : null,
    useCase(input.subcategorySlug),
    `Orijinal ${brandLabel} modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.`,
  ].filter((part): part is string => part !== null);

  return {
    seoTitle: seoTitleFor(input),
    seoDescription: clampSeoText(seoDescription, SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(introBits.join(' '), 700),
  };
}

export function buildTwoEProductDescription(
  pageIntro: string,
  specs: readonly TwoESeoSpec[],
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
