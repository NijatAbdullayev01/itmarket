/**
 * UGREEN catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';
import {
  normalizeUgreenSku,
  ugreenDisplayModel,
  type UgreenNameSpec,
} from './ugreen-product-name';

export type UgreenSeoSpec = UgreenNameSpec;

export type UgreenSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type UgreenSeoInput = {
  sku: string;
  title: string;
  specs: readonly UgreenSeoSpec[];
  subcategorySlug: string;
};

function specValue(
  specs: readonly UgreenSeoSpec[],
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
    'sarj-cihazi': 'şarj cihazı',
    'simsiz-sarj': 'simsiz şarj',
    'avtomobil-telefon-sarji': 'avtomobil şarjı',
    powerbank: 'powerbank',
    'usb-kabel': 'USB kabel',
    'audio-kabel': 'audio kabel',
    'hdmi-kabel': 'HDMI kabel',
    qulaqliq: /earbud|tws/i.test(hay) ? 'TWS qulaqlıq' : 'qulaqlıq',
    'dok-stansiya': 'dok stansiyası',
    'video-adapter': 'video adapter',
    'hdmi-extender': 'HDMI extender',
    'usb-hub': 'USB hub',
    'usb-switch': 'USB switch',
    'kart-oxuyucusu': 'kart oxuyucu',
    'teqdimat-cihazi': 'simsiz presenter',
    'magsafe-aksesuar': 'MagSafe aksesuarı',
    'avtomobil-telefon-tutacagi': 'avtomobil tutacağı',
    'telefon-dayagi': 'telefon dayaqı',
    'noutbuk-aksesuarlari': 'noutbuk dayaqı',
    'noutbuk-cantasi': 'noutbuk çantası',
    'hdd-qutusu': 'HDD qutu',
    'bluetooth-adapter': 'Bluetooth adapter',
    'bluetooth-adapter-audio': 'Bluetooth ötürücü',
    'ses-karti': 'səs kartı',
    sican: 'simsiz siçan',
    mikrofon: 'USB mikrofon',
    'sebeke-adapteri': 'şəbəkə adapteri',
    'sebeke-aksesuarlari': 'şəbəkə aksesuarı',
  };
  return bySlug[subcategorySlug] ?? 'UGREEN aksesuarı';
}

function specSnippet(specs: readonly UgreenSeoSpec[]): string | null {
  const preferred = [
    specValue(specs, (label) => label === 'tip'),
    specValue(specs, (label) => label === 'seriya'),
    specValue(specs, (label) => label === 'ümumi güc' || label === 'güc'),
    specValue(
      specs,
      (label) => label === 'tutum' || label.includes('batareya'),
    ),
    specValue(specs, (label) => label.startsWith('uzunluq')),
    specValue(specs, (label) => label === 'portlar'),
    specValue(specs, (label) => label === 'rəng'),
    specValue(specs, (label) => label.startsWith('texnologiya')),
  ].filter((value): value is string => value !== null);
  if (preferred.length === 0) {
    return null;
  }
  return preferred.slice(0, 2).join(', ');
}

function useCase(subcategorySlug: string): string {
  if (subcategorySlug === 'sarj-cihazi' || subcategorySlug === 'simsiz-sarj') {
    return 'Telefon, noutbuk və qulaqlıq üçün gündəlik şarj üçün nəzərdə tutulub.';
  }
  if (
    subcategorySlug === 'avtomobil-telefon-sarji' ||
    subcategorySlug === 'avtomobil-telefon-tutacagi'
  ) {
    return 'Avtomobildə telefon şarjı və istifadəsi üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'powerbank') {
    return 'Yolda və ofisdə əlavə enerji üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'usb-kabel' || subcategorySlug === 'audio-kabel') {
    return 'Gündəlik şarj, data və audio bağlantısı üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'qulaqliq') {
    return 'Musiqi, zəng və gündəlik istifadə üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'dok-stansiya' || subcategorySlug === 'usb-hub') {
    return 'Noutbuk və USB-C host üçün əlavə portlar təmin edir.';
  }
  if (subcategorySlug === 'sican') {
    return 'Ofis və gündəlik kompüter işi üçün nəzərdə tutulub.';
  }
  if (
    subcategorySlug === 'sebeke-adapteri' ||
    subcategorySlug === 'sebeke-aksesuarlari'
  ) {
    return 'Ev və ofis şəbəkə bağlantısı üçün nəzərdə tutulub.';
  }
  return 'Ev, ofis və gündəlik IT istifadəsi üçün nəzərdə tutulub.';
}

export function resolveUgreenProductSeo(input: UgreenSeoInput): UgreenSeoCopy {
  const sku = normalizeUgreenSku(input.sku);
  const kind = kindLabel(input.subcategorySlug, input.title);
  const model = ugreenDisplayModel(
    input.title,
    input.specs,
    input.subcategorySlug,
  );
  const snippet = specSnippet(input.specs);

  const seoTitle = clampSeoText(
    input.title.trim() || `UGREEN ${model} ${kind}`,
    SEO_TITLE_SOFT_MAX,
  );

  const descriptionParts = [
    `UGREEN ${sku}: ${snippet ?? kind}.`,
    `Orijinal UGREEN ${kind}, rəsmi zəmanət və çatdırılma.`,
  ];
  let seoDescription = descriptionParts.join(' ');
  if (seoDescription.length < 140) {
    seoDescription = `${seoDescription} Kataloqda orijinal model, rəsmi zəmanətlə satılır.`;
  }
  if (seoDescription.length < 140) {
    seoDescription = `${seoDescription} UGREEN aksesuarları rəsmi zəmanətlə təqdim olunur.`;
  }

  const introBits = [
    `${input.title.trim()} (${sku}) orijinal UGREEN ${kind}dir.`,
    snippet ? `${snippet}.` : null,
    useCase(input.subcategorySlug),
    'Orijinal UGREEN modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  ].filter((part): part is string => part !== null);

  return {
    seoTitle,
    seoDescription: clampSeoText(seoDescription, SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(introBits.join(' '), 700),
  };
}

export function buildUgreenProductDescription(
  pageIntro: string,
  specs: readonly UgreenSeoSpec[],
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
