/**
 * Apacer catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';
import {
  apacerDisplayModel,
  normalizeApacerSku,
  type ApacerNameSpec,
} from './apacer-product-name';

export type ApacerSeoSpec = ApacerNameSpec;

export type ApacerSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type ApacerSeoInput = {
  sku: string;
  title: string;
  specs: readonly ApacerSeoSpec[];
  subcategorySlug: string;
};

function specValue(
  specs: readonly ApacerSeoSpec[],
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

function kindLabel(subcategorySlug: string): string {
  const bySlug: Record<string, string> = {
    'ddr4-ram': 'DDR4 RAM',
    'm2-nvme-ssd': 'M.2 NVMe SSD',
    'gaming-ssd': 'oyun NVMe SSD',
    'usb-flash': 'USB flash',
    'xarici-ssd': 'xarici SSD',
    'xarici-hdd': 'xarici HDD',
  };
  return bySlug[subcategorySlug] ?? 'yaddaş';
}

function specSnippet(specs: readonly ApacerSeoSpec[]): string | null {
  const preferred = [
    specValue(specs, (label) => label === 'tutum'),
    specValue(specs, (label) => label === 'tezlik'),
    specValue(specs, (label) => label === 'interfeys'),
    specValue(
      specs,
      (label) =>
        label === 'oxuma / yazma' ||
        label === 'oxuma/yazma' ||
        label.startsWith('oxuma'),
    ),
    specValue(specs, (label) => label === 'form faktor' || label === 'format'),
    specValue(specs, (label) => label === 'rəng' || label === 'reng'),
  ].filter((value): value is string => value !== null);
  if (preferred.length === 0) {
    return null;
  }
  return preferred.slice(0, 3).join(', ');
}

function useCase(subcategorySlug: string): string {
  if (subcategorySlug === 'ddr4-ram') {
    return 'Noutbuk üçün SODIMM DDR4 moduludur.';
  }
  if (subcategorySlug === 'm2-nvme-ssd') {
    return 'PCIe Gen4 NVMe M.2 2280 sistem yaddaşı üçündür.';
  }
  if (subcategorySlug === 'gaming-ssd') {
    return 'PS5 və gaming PC üçün heatsink-li yüksək sürətli NVMe SSD-dir.';
  }
  if (subcategorySlug === 'usb-flash') {
    return 'Fayl köçürmə və gündəlik yedək üçündür.';
  }
  if (subcategorySlug === 'xarici-ssd') {
    return 'Noutbuk, telefon və konsol yedəkləməsi üçündür.';
  }
  return 'Portativ yedəkləmə və arxiv saxlama üçündür.';
}

function warrantyPhrase(specs: readonly ApacerSeoSpec[]): string {
  const warranty = specValue(specs, (label) => label === 'zəmanət');
  if (warranty !== null && /ömürlük/i.test(warranty)) {
    return 'ömürlük rəsmi zəmanət və çatdırılma';
  }
  if (warranty !== null && /(\d+)\s*il/i.test(warranty)) {
    const years = warranty.match(/(\d+)\s*il/i)?.[1];
    if (years !== undefined) {
      return `${years} il rəsmi zəmanət və çatdırılma`;
    }
  }
  return 'rəsmi zəmanət və çatdırılma';
}

function seoTitleFor(input: ApacerSeoInput): string {
  const sku = normalizeApacerSku(input.sku);
  const model = apacerDisplayModel(sku, input.title);
  const core =
    model === ''
      ? input.title.trim() || `Apacer ${sku}`
      : `Apacer ${model}`.replace(/\s+/g, ' ').trim();
  const withSku = `${core} (${sku})`.replace(/\s+/g, ' ').trim();
  if (withSku.length <= SEO_TITLE_SOFT_MAX) {
    return withSku;
  }
  if (core.length <= SEO_TITLE_SOFT_MAX) {
    return core;
  }
  const skuTitle = `Apacer ${sku}`;
  if (skuTitle.length <= SEO_TITLE_SOFT_MAX) {
    return skuTitle;
  }
  return clampSeoText(core, SEO_TITLE_SOFT_MAX);
}

export function resolveApacerProductSeo(
  input: ApacerSeoInput,
): ApacerSeoCopy {
  const sku = normalizeApacerSku(input.sku);
  const kind = kindLabel(input.subcategorySlug);
  const snippet = specSnippet(input.specs);
  const title = input.title.trim();
  const warranty = warrantyPhrase(input.specs);

  const descriptionParts = [
    `Apacer ${sku}: ${snippet ?? kind}.`,
    `Orijinal Apacer ${kind}, ${warranty}.`,
  ];
  let seoDescription = descriptionParts.join(' ');
  if (seoDescription.length < 140) {
    seoDescription = `${seoDescription} Kataloqda orijinal model, rəsmi zəmanətlə satılır.`;
  }
  if (seoDescription.length < 140) {
    seoDescription = `${seoDescription} Apacer yaddaş məhsulları rəsmi zəmanətlə təqdim olunur.`;
  }

  const introBits = [
    `${title} (${sku}) orijinal Apacer ${kind}dir.`,
    snippet ? `${snippet}.` : null,
    useCase(input.subcategorySlug),
    `Orijinal Apacer modelidir; ${warranty} ilə təqdim olunur.`,
  ].filter((part): part is string => part !== null);

  return {
    seoTitle: seoTitleFor(input),
    seoDescription: clampSeoText(seoDescription, SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(introBits.join(' '), 700),
  };
}

export function buildApacerProductDescription(
  pageIntro: string,
  specs: readonly ApacerSeoSpec[],
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
