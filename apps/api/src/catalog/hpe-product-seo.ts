/**
 * HPE catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';

export type HpeSeoSpec = {
  label: string;
  value: string;
};

export type HpeSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type HpeSeoInput = {
  sku: string;
  title: string;
  specs: readonly HpeSeoSpec[];
  subcategorySlug: string;
};

type HpeTypeCopy = {
  productType: string;
  titleHint: string;
};

const TYPE_COPY_BY_SLUG: Record<string, HpeTypeCopy> = {
  'tower-server': {
    productType: 'orijinal HPE tower server',
    titleHint: 'tower server',
  },
  'rack-server': {
    productType: 'orijinal HPE rack server',
    titleHint: 'rack server',
  },
  prosessor: {
    productType: 'orijinal HPE server prosessoru',
    titleHint: 'prosessor',
  },
  'server-ram': {
    productType: 'orijinal HPE server yaddaşı',
    titleHint: 'RDIMM',
  },
  'server-hdd': {
    productType: 'orijinal HPE server HDD',
    titleHint: 'HDD',
  },
  'server-ssd': {
    productType: 'orijinal HPE server SSD',
    titleHint: 'SSD',
  },
  'server-sebeke-adapteri': {
    productType: 'orijinal HPE server şəbəkə adapteri',
    titleHint: 'NIC',
  },
  'server-sfp-modullar': {
    productType: 'orijinal HPE SFP modul',
    titleHint: 'SFP',
  },
  'server-aksesuarlari': {
    productType: 'orijinal HPE server aksesuarı',
    titleHint: 'aksesuar',
  },
};

const META_FILLERS = [
  'Rəsmi zəmanət və çatdırılma.',
  'Orijinal məhsul, peşəkar dəstək və mağazadan təhvil.',
  'Bakı anbarından çatdırılma mümkündür.',
] as const;

function specValue(
  specs: readonly HpeSeoSpec[],
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

function resolveTypeCopy(subcategorySlug: string): HpeTypeCopy {
  return (
    TYPE_COPY_BY_SLUG[subcategorySlug] ?? {
      productType: 'orijinal HPE məhsulu',
      titleHint: 'HPE',
    }
  );
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripLeadingBrand(title: string): string {
  return collapseWhitespace(title.replace(/^HPE\s+/i, ''));
}

function buildSeoTitle(input: HpeSeoInput, typeCopy: HpeTypeCopy): string {
  const rest = stripLeadingBrand(input.title);
  const withHint = rest
    .toLocaleLowerCase('az')
    .includes(typeCopy.titleHint.toLocaleLowerCase('az'))
    ? `HPE ${rest}`
    : `HPE ${rest} ${typeCopy.titleHint}`;
  return clampSeoText(collapseWhitespace(withHint), SEO_TITLE_SOFT_MAX);
}

function keySpecSnippets(input: HpeSeoInput): string[] {
  const kind = specValue(
    input.specs,
    (label) => label === 'növ' || label === 'tip',
  );
  const cpu = specValue(input.specs, (label) => label.startsWith('prosessor'));
  const ram = specValue(
    input.specs,
    (label) =>
      label === 'ram' ||
      label.startsWith('ram (') ||
      label.includes('müvəqqəti'),
  );
  const storage = specValue(
    input.specs,
    (label) =>
      label === 'saxlama' ||
      label === 'yaddaş' ||
      label === 'yaddas' ||
      label.startsWith('yaddaş (') ||
      label.startsWith('yaddas ('),
  );
  const capacity = specValue(
    input.specs,
    (label) => label === 'tutum' || label.endsWith(' tutumu'),
  );
  const iface = specValue(
    input.specs,
    (label) => label === 'interfeys' || label.startsWith('interfeys'),
  );
  const length = specValue(input.specs, (label) => label === 'uzunluq');
  const ports = specValue(
    input.specs,
    (label) => label === 'port sayı' || label.startsWith('port'),
  );
  const form = specValue(
    input.specs,
    (label) => label === 'form faktor' || label.startsWith('form'),
  );
  const compatible = specValue(
    input.specs,
    (label) => label === 'uyğunluq' || label.startsWith('uyğun'),
  );
  const standard = specValue(
    input.specs,
    (label) => label === 'standart' || label.includes('standart'),
  );
  const distance = specValue(
    input.specs,
    (label) => label === 'məsafə' || label.startsWith('məsafə'),
  );
  const tdp = specValue(input.specs, (label) => label === 'tdp');
  const cores = specValue(
    input.specs,
    (label) => label.startsWith('nüvə') || label.startsWith('nuve'),
  );

  return [
    cpu ? `Prosessor: ${cpu}.` : null,
    ram ? `RAM: ${ram}.` : null,
    storage ? `Yaddaş: ${storage}.` : null,
    capacity ? `Tutum: ${capacity}.` : null,
    iface ? `İnterfeys: ${iface}.` : null,
    length ? `Uzunluq: ${length}.` : null,
    ports ? `Port: ${ports}.` : null,
    form ? `Form faktor: ${form}.` : null,
    standard ? `Standart: ${standard}.` : null,
    distance ? `Məsafə: ${distance}.` : null,
    tdp ? `TDP: ${tdp}.` : null,
    cores ? `${cores}.` : null,
    compatible ? `${compatible}.` : null,
    kind ? `${kind}.` : null,
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

export function resolveHpeProductSeo(input: HpeSeoInput): HpeSeoCopy {
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
    `${title} (${sku}) HPE kataloqunda ${typeCopy.productType} kimi təqdim olunur.`,
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

export function buildHpeProductDescription(
  pageIntro: string,
  specs: readonly HpeSeoSpec[],
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

export function listHpeSeoSubcategorySlugs(): string[] {
  return Object.keys(TYPE_COPY_BY_SLUG);
}
