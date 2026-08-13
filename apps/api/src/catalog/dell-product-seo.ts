/**
 * Dell catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';

export type DellSeoSpec = {
  label: string;
  value: string;
};

export type DellSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type DellSeoInput = {
  sku: string;
  title: string;
  specs: readonly DellSeoSpec[];
  subcategorySlug: string;
};

type DellTypeCopy = {
  productType: string;
  titleHint: string;
};

const TYPE_COPY_BY_SLUG: Record<string, DellTypeCopy> = {
  noutbuk: {
    productType: 'orijinal Dell noutbuk',
    titleHint: 'noutbuk',
  },
  '2-in-1-noutbuk': {
    productType: 'orijinal Dell 2-in-1 noutbuk',
    titleHint: '2-in-1 noutbuk',
  },
  'mobil-workstation': {
    productType: 'orijinal Dell mobil workstation',
    titleHint: 'workstation',
  },
  'enerji-adapteri': {
    productType: 'orijinal Dell enerji adapteri',
    titleHint: 'adapter',
  },
  'noutbuk-cantasi': {
    productType: 'orijinal Dell noutbuk çantası',
    titleHint: 'çanta',
  },
  'noutbuk-aksesuarlari': {
    productType: 'orijinal Dell noutbuk aksesuarı',
    titleHint: 'aksesuar',
  },
  monitor: {
    productType: 'orijinal Dell monitor',
    titleHint: 'monitor',
  },
  'usb-c-hub-monitor': {
    productType: 'orijinal Dell USB-C hub monitor',
    titleHint: 'USB-C monitor',
  },
  'ultra-keskin-monitor': {
    productType: 'orijinal Dell UltraSharp monitor',
    titleHint: 'UltraSharp',
  },
  'ultra-genis-monitor': {
    productType: 'orijinal Dell ultra geniş monitor',
    titleHint: 'ultrawide',
  },
  'gaming-monitor': {
    productType: 'orijinal Dell gaming monitor',
    titleHint: 'gaming monitor',
  },
  'gaming-klaviatura': {
    productType: 'orijinal Dell gaming klaviatura',
    titleHint: 'gaming klaviatura',
  },
  'gaming-sican': {
    productType: 'orijinal Dell gaming siçan',
    titleHint: 'gaming siçan',
  },
  'gaming-canta': {
    productType: 'orijinal Dell gaming çanta',
    titleHint: 'gaming çanta',
  },
  'gaming-qulaqliq': {
    productType: 'orijinal Dell gaming qulaqlıq',
    titleHint: 'gaming qulaqlıq',
  },
  qulaqliq: {
    productType: 'orijinal Dell qulaqlıq',
    titleHint: 'qulaqlıq',
  },
  masaustu: {
    productType: 'orijinal Dell masaüstü kompüter',
    titleHint: 'masaüstü',
  },
  monoblok: {
    productType: 'orijinal Dell monoblok',
    titleHint: 'monoblok',
  },
  'dok-stansiya': {
    productType: 'orijinal Dell dok stansiyası',
    titleHint: 'dok stansiya',
  },
  klaviatura: {
    productType: 'orijinal Dell klaviatura',
    titleHint: 'klaviatura',
  },
  sican: {
    productType: 'orijinal Dell siçan',
    titleHint: 'siçan',
  },
  'klaviatura-ve-sican-desti': {
    productType: 'orijinal Dell klaviatura və siçan dəsti',
    titleHint: 'klaviatura dəsti',
  },
  'sebeke-adapteri': {
    productType: 'orijinal Dell şəbəkə adapteri',
    titleHint: 'şəbəkə adapteri',
  },
};

const META_FILLERS = [
  'Rəsmi zəmanət və çatdırılma.',
  'Orijinal məhsul, peşəkar dəstək və mağazadan təhvil.',
] as const;

function specValue(
  specs: readonly DellSeoSpec[],
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

function resolveTypeCopy(subcategorySlug: string): DellTypeCopy {
  return (
    TYPE_COPY_BY_SLUG[subcategorySlug] ?? {
      productType: 'orijinal Dell məhsulu',
      titleHint: 'Dell',
    }
  );
}

function displayBrand(title: string): 'Alienware' | 'Dell' {
  return /alienware/i.test(title) ? 'Alienware' : 'Dell';
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripLeadingBrand(title: string): string {
  return collapseWhitespace(title.replace(/^(Dell|Alienware)\s+/i, ''));
}

function buildSeoTitle(input: DellSeoInput, typeCopy: DellTypeCopy): string {
  const brand = displayBrand(input.title);
  const rest = stripLeadingBrand(input.title);
  const withHint = rest
    .toLocaleLowerCase('az')
    .includes(typeCopy.titleHint.toLocaleLowerCase('az'))
    ? `${brand} ${rest}`
    : `${brand} ${rest} ${typeCopy.titleHint}`;
  return clampSeoText(collapseWhitespace(withHint), SEO_TITLE_SOFT_MAX);
}

function keySpecSnippets(input: DellSeoInput): string[] {
  const cpu = specValue(input.specs, (label) => label.startsWith('prosessor'));
  const ram = specValue(
    input.specs,
    (label) => label === 'ram' || label.includes('müvəqqəti'),
  );
  const storage = specValue(
    input.specs,
    (label) => label === 'yaddaş' || label === 'yaddas',
  );
  const screen = specValue(
    input.specs,
    (label) => label === 'ekran' || label.startsWith('ekran ölç'),
  );
  const resolution = specValue(
    input.specs,
    (label) => label.startsWith('görüntü') || label === 'panel',
  );
  const graphics = specValue(input.specs, (label) =>
    label.startsWith('qrafika'),
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
    resolution ? `${resolution}.` : null,
    graphics ? `Qrafika: ${graphics}.` : null,
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

export function resolveDellProductSeo(input: DellSeoInput): DellSeoCopy {
  const sku = input.sku.trim().toUpperCase();
  const typeCopy = resolveTypeCopy(input.subcategorySlug);
  const brand = displayBrand(input.title);
  const title = collapseWhitespace(input.title);
  const snippets = keySpecSnippets(input);

  const seoTitle = buildSeoTitle(input, typeCopy);

  const metaParts = [
    `${title} (${sku}) — ${typeCopy.productType}.`,
    snippets[0] ?? null,
    snippets[1] ?? null,
  ].filter((part): part is string => part !== null);

  const introParts = [
    `${title} (${sku}) ${brand === 'Alienware' ? 'Alienware' : 'Dell'} kataloqunda ${typeCopy.productType} kimi təqdim olunur.`,
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

export function buildDellProductDescription(
  pageIntro: string,
  specs: readonly DellSeoSpec[],
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

export function listDellSeoSubcategorySlugs(): string[] {
  return Object.keys(TYPE_COPY_BY_SLUG);
}
