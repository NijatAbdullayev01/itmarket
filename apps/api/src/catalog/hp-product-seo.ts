/**
 * HP catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';

export type HpSeoSpec = {
  label: string;
  value: string;
};

export type HpSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type HpSeoInput = {
  sku: string;
  title: string;
  specs: readonly HpSeoSpec[];
  subcategorySlug: string;
};

type HpTypeCopy = {
  productType: string;
  titleHint: string;
};

const TYPE_COPY_BY_SLUG: Record<string, HpTypeCopy> = {
  noutbuk: {
    productType: 'orijinal HP noutbuk',
    titleHint: 'noutbuk',
  },
  '2-in-1-noutbuk': {
    productType: 'orijinal HP 2-in-1 noutbuk',
    titleHint: '2-in-1 noutbuk',
  },
  'mobil-workstation': {
    productType: 'orijinal HP mobil workstation',
    titleHint: 'workstation',
  },
  'enerji-adapteri': {
    productType: 'orijinal HP enerji adapteri',
    titleHint: 'adapter',
  },
  'noutbuk-cantasi': {
    productType: 'orijinal HP noutbuk çantası',
    titleHint: 'çanta',
  },
  'noutbuk-aksesuarlari': {
    productType: 'orijinal HP noutbuk aksesuarı',
    titleHint: 'aksesuar',
  },
  monitor: {
    productType: 'orijinal HP monitor',
    titleHint: 'monitor',
  },
  'ultra-keskin-monitor': {
    productType: 'orijinal HP Ultra kəskin monitor',
    titleHint: '4K monitor',
  },
  'ultra-genis-monitor': {
    productType: 'orijinal HP ultra geniş monitor',
    titleHint: 'ultrawide',
  },
  qulaqliq: {
    productType: 'orijinal HP qulaqlıq',
    titleHint: 'qulaqlıq',
  },
  masaustu: {
    productType: 'orijinal HP masaüstü kompüter',
    titleHint: 'masaüstü',
  },
  monoblok: {
    productType: 'orijinal HP monoblok',
    titleHint: 'monoblok',
  },
  'dok-stansiya': {
    productType: 'orijinal HP dok stansiyası',
    titleHint: 'dok stansiya',
  },
  klaviatura: {
    productType: 'orijinal HP klaviatura',
    titleHint: 'klaviatura',
  },
  sican: {
    productType: 'orijinal HP siçan',
    titleHint: 'siçan',
  },
  'klaviatura-ve-sican-desti': {
    productType: 'orijinal HP klaviatura və siçan dəsti',
    titleHint: 'klaviatura dəsti',
  },
  videokart: {
    productType: 'orijinal HP videokart',
    titleHint: 'videokart',
  },
  'inkjet-mfp': {
    productType: 'orijinal HP inkjet çoxfunksiyalı printer',
    titleHint: 'inkjet MFP',
  },
  'lazer-printer': {
    productType: 'orijinal HP lazer printer',
    titleHint: 'lazer printer',
  },
  'lazer-mfp': {
    productType: 'orijinal HP lazer MFP',
    titleHint: 'lazer MFP',
  },
  'rengli-lazer-printer': {
    productType: 'orijinal HP rəngli lazer printer',
    titleHint: 'rəngli lazer',
  },
  'rengli-lazer-mfp': {
    productType: 'orijinal HP rəngli lazer MFP',
    titleHint: 'rəngli MFP',
  },
  skaner: {
    productType: 'orijinal HP skaner',
    titleHint: 'skaner',
  },
  kartric: {
    productType: 'orijinal HP toner kartrici',
    titleHint: 'toner',
  },
};

const META_FILLERS = [
  'Rəsmi zəmanət və çatdırılma.',
  'Orijinal məhsul, peşəkar dəstək və mağazadan təhvil.',
  'Bakıda təhvil və rəsmi servis dəstəyi.',
] as const;

function specValue(
  specs: readonly HpSeoSpec[],
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

function resolveTypeCopy(subcategorySlug: string): HpTypeCopy {
  return (
    TYPE_COPY_BY_SLUG[subcategorySlug] ?? {
      productType: 'orijinal HP məhsulu',
      titleHint: 'HP',
    }
  );
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripLeadingBrand(title: string): string {
  return collapseWhitespace(title.replace(/^HP\s+/i, ''));
}

function buildSeoTitle(input: HpSeoInput, typeCopy: HpTypeCopy): string {
  const rest = stripLeadingBrand(input.title);
  const withHint = rest
    .toLocaleLowerCase('az')
    .includes(typeCopy.titleHint.toLocaleLowerCase('az'))
    ? `HP ${rest}`
    : `HP ${rest} ${typeCopy.titleHint}`;
  return clampSeoText(collapseWhitespace(withHint), SEO_TITLE_SOFT_MAX);
}

const PRINTER_FAMILY_SLUGS = new Set([
  'inkjet-mfp',
  'lazer-printer',
  'lazer-mfp',
  'rengli-lazer-printer',
  'rengli-lazer-mfp',
  'skaner',
  'kartric',
]);

function printerSpecSnippets(input: HpSeoInput): string[] {
  const functions = specValue(
    input.specs,
    (label) => label === 'funksiyalar',
  );
  const format = specValue(input.specs, (label) => label === 'format');
  const speed = specValue(
    input.specs,
    (label) =>
      label.startsWith('çap sürəti (qara') || label === 'çap sürəti',
  );
  const yieldPages = specValue(input.specs, (label) => label === 'tutum');
  const compatible = specValue(input.specs, (label) => label === 'uyğunluq');
  const optical = specValue(
    input.specs,
    (label) => label.includes('optik') && label.includes('həll'),
  );
  const color = specValue(
    input.specs,
    (label) => label === 'rəng' || label === 'reng',
  );

  return [
    functions ? `Funksiyalar: ${functions}.` : null,
    format ? `Format: ${format}.` : null,
    speed ? `Çap sürəti: ${speed}.` : null,
    yieldPages ? `Tutum: ${yieldPages}.` : null,
    compatible ? `${compatible}.` : null,
    optical ? `Optik həll: ${optical}.` : null,
    input.subcategorySlug === 'kartric' && color !== null
      ? `Rəng: ${color}.`
      : null,
  ].filter((part): part is string => part !== null);
}

function keySpecSnippets(input: HpSeoInput): string[] {
  if (PRINTER_FAMILY_SLUGS.has(input.subcategorySlug)) {
    return printerSpecSnippets(input);
  }

  const cpu = specValue(input.specs, (label) => label.startsWith('prosessor'));
  const ram = specValue(
    input.specs,
    (label) =>
      label === 'ram' ||
      label.includes('müvəqqəti') ||
      label.includes('operativ'),
  );
  const storage = specValue(
    input.specs,
    (label) => label === 'yaddaş' || label === 'yaddas',
  );
  const screen = specValue(
    input.specs,
    (label) => label === 'ekran' || label.startsWith('ekran ölç'),
  );
  const graphics = specValue(input.specs, (label) =>
    label.startsWith('qrafika'),
  );
  const gpuTip = specValue(input.specs, (label) => label === 'tip');
  const outputs = specValue(
    input.specs,
    (label) => label === 'çıxış' || label === 'cixis',
  );
  const power = specValue(
    input.specs,
    (label) =>
      label.includes('güc') || label.includes('watt') || label === 'pd',
  );

  return [
    cpu ? `Prosessor: ${cpu}.` : null,
    ram ? `RAM: ${ram}.` : null,
    storage ? `Yaddaş: ${storage}.` : null,
    screen ? `Ekran: ${screen}.` : null,
    graphics ? `Qrafika: ${graphics}.` : null,
    gpuTip ? `${gpuTip}.` : null,
    outputs ? `${outputs}.` : null,
    power ? `${power}.` : null,
  ].filter((part): part is string => part !== null);
}

function fillToMinLength(
  text: string,
  minLength: number,
  maxLength: number,
): string {
  let result = collapseWhitespace(text);
  for (const filler of META_FILLERS) {
    if (result.length >= minLength) {
      break;
    }
    result = collapseWhitespace(`${result} ${filler}`);
  }
  return clampSeoText(result, maxLength);
}

export function resolveHpProductSeo(input: HpSeoInput): HpSeoCopy {
  const sku = input.sku.trim().toUpperCase();
  const typeCopy = resolveTypeCopy(input.subcategorySlug);
  const title = collapseWhitespace(input.title);
  const snippets = keySpecSnippets(input);

  const seoTitle = buildSeoTitle(input, typeCopy);

  const metaParts = [
    `${title} (${sku}) — ${typeCopy.productType}.`,
    snippets[0] ?? null,
    snippets[1] ?? null,
  ].filter((part): part is string => part !== null);

  const introParts = [
    `${title} (${sku}) HP kataloqunda ${typeCopy.productType} kimi təqdim olunur.`,
    ...snippets.slice(0, 4),
    'Konfiqurasiyanı müqayisə edib rəsmi zəmanət və çatdırılma ilə sifariş edə bilərsiniz.',
  ];

  return {
    seoTitle,
    seoDescription: fillToMinLength(
      metaParts.join(' '),
      140,
      SEO_DESCRIPTION_SOFT_MAX,
    ),
    pageIntro: fillToMinLength(introParts.join(' '), 180, 700),
  };
}

export function buildHpProductDescription(
  pageIntro: string,
  specs: readonly HpSeoSpec[],
  unlabeledFeatures?: string,
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
  const intro = pageIntro.trim();
  if (specLines.length > 0) {
    return `${intro}\n\n${specLines.join('\n')}`;
  }
  const prose = collapseWhitespace(unlabeledFeatures ?? '');
  if (prose !== '') {
    return `${intro}\n\n${prose}`;
  }
  return intro;
}

export function listHpSeoSubcategorySlugs(): string[] {
  return Object.keys(TYPE_COPY_BY_SLUG);
}
