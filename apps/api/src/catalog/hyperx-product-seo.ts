/**
 * HyperX catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';
import {
  hyperxDisplayModel,
  normalizeHyperxSku,
  type HyperxNameSpec,
} from './hyperx-product-name';

export type HyperxSeoSpec = HyperxNameSpec;

export type HyperxSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type HyperxSeoInput = {
  sku: string;
  title: string;
  specs: readonly HyperxSeoSpec[];
  subcategorySlug: string;
};

function specValue(
  specs: readonly HyperxSeoSpec[],
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
    if (/\btws\b/.test(hay) || /qulaqici/.test(hay)) {
      if (/qulaqici/.test(hay)) {
        return 'qulaqici oyun qulaqlığı';
      }
      return 'TWS oyun qulaqlığı';
    }
    if (/simsiz/.test(hay)) {
      return 'simsiz oyun qulaqlığı';
    }
    return 'oyun qulaqlığı';
  }
  const bySlug: Record<string, string> = {
    'gaming-monitor': 'oyun monitoru',
    'gaming-klaviatura': /dayağı|dayagi/.test(hay)
      ? 'klaviatura dayağı'
      : /simsiz/.test(hay)
        ? 'simsiz oyun klaviaturası'
        : 'oyun klaviaturası',
    'gaming-sican': /dayağı|dayagi/.test(hay)
      ? 'siçan dayağı'
      : /simsiz/.test(hay)
        ? 'simsiz oyun siçanı'
        : 'oyun siçanı',
    'gaming-canta': 'oyun çantası',
    'gaming-mikrofon': /qolu/.test(hay) ? 'mikrofon qolu' : 'oyun mikrofonu',
    'gaming-sican-altligi': 'siçan altlığı',
    'gaming-veb-kamera': 'veb kamera',
    'gaming-pult': 'oyun pultu',
    'gaming-sarj-stansiyasi': 'şarj stansiyası',
    'gaming-audio-mikser': 'audio mikser',
  };
  return bySlug[subcategorySlug] ?? 'oyun aksesuarı';
}

function specSnippet(specs: readonly HyperxSeoSpec[]): string | null {
  const preferred = [
    specValue(specs, (label) => label === 'tip'),
    specValue(specs, (label) => label === 'bağlantı' || label === 'baglanti'),
    specValue(specs, (label) => label === 'sürücü' || label === 'surucu'),
    specValue(specs, (label) => label === 'forma'),
    specValue(specs, (label) => label === 'switch'),
    specValue(specs, (label) => label.startsWith('sensor')),
    specValue(specs, (label) => label === 'diaqonal'),
    specValue(specs, (label) => label === 'ölçü' || label === 'olcu'),
  ].filter((value): value is string => value !== null);
  if (preferred.length === 0) {
    return null;
  }
  return preferred.slice(0, 2).join(', ');
}

function useCase(subcategorySlug: string): string {
  if (subcategorySlug === 'gaming-monitor') {
    return 'Oyun və e-sports üçün yüksək yenilənmə tezlikli monitordur.';
  }
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
    return 'Strim, podcast və Discord üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'gaming-veb-kamera') {
    return 'Strim və videozənglər üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'gaming-pult') {
    return 'Xbox və PC oyunları üçün nəzərdə tutulub.';
  }
  return 'Oyun və gündəlik istifadə üçün nəzərdə tutulub.';
}

function seoTitleFor(input: HyperxSeoInput): string {
  const sku = normalizeHyperxSku(input.sku);
  const model = hyperxDisplayModel(sku, input.title);
  const core =
    model === ''
      ? input.title.trim() || `HyperX ${sku}`
      : `HyperX ${model}`.replace(/\s+/g, ' ').trim();
  const withSku = `${core} (${sku})`.replace(/\s+/g, ' ').trim();
  if (withSku.length <= SEO_TITLE_SOFT_MAX) {
    return withSku;
  }
  if (core.length <= SEO_TITLE_SOFT_MAX) {
    return core;
  }
  return clampSeoText(`HyperX ${sku}`, SEO_TITLE_SOFT_MAX);
}

export function resolveHyperxProductSeo(input: HyperxSeoInput): HyperxSeoCopy {
  const sku = normalizeHyperxSku(input.sku);
  const kind = kindLabel(input.subcategorySlug, input.title);
  const snippet = specSnippet(input.specs);
  const title = input.title.trim();

  const descriptionParts = [
    `HyperX ${sku}: ${snippet ?? kind}.`,
    `Orijinal HyperX ${kind}, rəsmi zəmanət və çatdırılma.`,
  ];
  let seoDescription = descriptionParts.join(' ');
  if (seoDescription.length < 140) {
    seoDescription = `${seoDescription} Kataloqda orijinal model, rəsmi zəmanətlə satılır.`;
  }
  if (seoDescription.length < 140) {
    seoDescription = `${seoDescription} HyperX oyun aksesuarları rəsmi zəmanətlə təqdim olunur.`;
  }

  const introBits = [
    `${title} (${sku}) orijinal HyperX ${kind}dir.`,
    snippet ? `${snippet}.` : null,
    useCase(input.subcategorySlug),
    'Orijinal HyperX modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  ].filter((part): part is string => part !== null);

  return {
    seoTitle: seoTitleFor(input),
    seoDescription: clampSeoText(seoDescription, SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(introBits.join(' '), 700),
  };
}

export function buildHyperxProductDescription(
  pageIntro: string,
  specs: readonly HyperxSeoSpec[],
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
