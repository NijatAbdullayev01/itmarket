/**
 * Lenovo catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';

export type LenovoSeoSpec = {
  label: string;
  value: string;
};

export type LenovoSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type LenovoSeoInput = {
  sku: string;
  title: string;
  specs: readonly LenovoSeoSpec[];
  subcategorySlug: string;
};

type LenovoTypeCopy = {
  productType: string;
  titleHint: string;
};

const TYPE_COPY_BY_SLUG: Record<string, LenovoTypeCopy> = {
  noutbuk: {
    productType: 'orijinal Lenovo noutbuk',
    titleHint: 'noutbuk',
  },
  '2-in-1-noutbuk': {
    productType: 'orijinal Lenovo 2-in-1 noutbuk',
    titleHint: '2-in-1 noutbuk',
  },
  'mobil-workstation': {
    productType: 'orijinal Lenovo mobil workstation',
    titleHint: 'workstation',
  },
  'enerji-adapteri': {
    productType: 'orijinal Lenovo enerji adapteri',
    titleHint: 'adapter',
  },
  'noutbuk-cantasi': {
    productType: 'orijinal Lenovo noutbuk çantası',
    titleHint: 'çanta',
  },
  'noutbuk-aksesuarlari': {
    productType: 'orijinal Lenovo noutbuk aksesuarı',
    titleHint: 'aksesuar',
  },
  monitor: {
    productType: 'orijinal Lenovo monitor',
    titleHint: 'monitor',
  },
  'usb-c-hub-monitor': {
    productType: 'orijinal Lenovo USB-C hub monitor',
    titleHint: 'USB-C monitor',
  },
  'ultra-keskin-monitor': {
    productType: 'orijinal Lenovo Ultra kəskin monitor',
    titleHint: '4K monitor',
  },
  'ultra-genis-monitor': {
    productType: 'orijinal Lenovo ultra geniş monitor',
    titleHint: 'ultrawide',
  },
  monoblok: {
    productType: 'orijinal Lenovo monoblok',
    titleHint: 'monoblok',
  },
  'dok-stansiya': {
    productType: 'orijinal Lenovo dok stansiyası',
    titleHint: 'dok stansiya',
  },
  klaviatura: {
    productType: 'orijinal Lenovo klaviatura',
    titleHint: 'klaviatura',
  },
  sican: {
    productType: 'orijinal Lenovo siçan',
    titleHint: 'siçan',
  },
  'klaviatura-ve-sican-desti': {
    productType: 'orijinal Lenovo klaviatura və siçan dəsti',
    titleHint: 'klaviatura dəsti',
  },
  'hdmi-kabel': {
    productType: 'orijinal Lenovo HDMI kabel',
    titleHint: 'HDMI kabel',
  },
  'usb-hub': {
    productType: 'orijinal Lenovo USB hub',
    titleHint: 'USB hub',
  },
  'video-adapter': {
    productType: 'orijinal Lenovo video adapter',
    titleHint: 'video adapter',
  },
  powerbank: {
    productType: 'orijinal Lenovo powerbank',
    titleHint: 'powerbank',
  },
  'usb-kabel': {
    productType: 'orijinal Lenovo USB kabel',
    titleHint: 'USB kabel',
  },
  'sebeke-adapteri': {
    productType: 'orijinal Lenovo şəbəkə adapteri',
    titleHint: 'şəbəkə adapteri',
  },
};

const META_FILLERS = [
  'Rəsmi zəmanət və çatdırılma.',
  'Orijinal məhsul, peşəkar dəstək və mağazadan təhvil.',
  'Bakıda təhvil və rəsmi servis dəstəyi.',
] as const;

function specValue(
  specs: readonly LenovoSeoSpec[],
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

function resolveTypeCopy(subcategorySlug: string): LenovoTypeCopy {
  return (
    TYPE_COPY_BY_SLUG[subcategorySlug] ?? {
      productType: 'orijinal Lenovo məhsulu',
      titleHint: 'Lenovo',
    }
  );
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripLeadingBrand(title: string): string {
  return collapseWhitespace(title.replace(/^Lenovo\s+/i, ''));
}

function buildSeoTitle(
  input: LenovoSeoInput,
  typeCopy: LenovoTypeCopy,
): string {
  const rest = stripLeadingBrand(input.title);
  const withHint = rest
    .toLocaleLowerCase('az')
    .includes(typeCopy.titleHint.toLocaleLowerCase('az'))
    ? `Lenovo ${rest}`
    : `Lenovo ${rest} ${typeCopy.titleHint}`;
  return clampSeoText(collapseWhitespace(withHint), SEO_TITLE_SOFT_MAX);
}

function keySpecSnippets(input: LenovoSeoInput): string[] {
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
  const power = specValue(
    input.specs,
    (label) =>
      label.includes('güc') ||
      label.includes('watt') ||
      label.includes('batareya'),
  );

  return [
    cpu ? `Prosessor: ${cpu}.` : null,
    ram ? `RAM: ${ram}.` : null,
    storage ? `Yaddaş: ${storage}.` : null,
    screen ? `Ekran: ${screen}.` : null,
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

export function resolveLenovoProductSeo(input: LenovoSeoInput): LenovoSeoCopy {
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
    `${title} (${sku}) Lenovo kataloqunda ${typeCopy.productType} kimi təqdim olunur.`,
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

export function buildLenovoProductDescription(
  pageIntro: string,
  specs: readonly LenovoSeoSpec[],
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
  return intro;
}

export function listLenovoSeoSubcategorySlugs(): string[] {
  return Object.keys(TYPE_COPY_BY_SLUG);
}
