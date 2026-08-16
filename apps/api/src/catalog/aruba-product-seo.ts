/**
 * Aruba catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';
import {
  arubaDisplayModel,
  normalizeArubaSku,
  type ArubaNameSpec,
} from './aruba-product-name';

export type ArubaSeoSpec = ArubaNameSpec;

export type ArubaSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type ArubaSeoInput = {
  sku: string;
  title: string;
  specs: readonly ArubaSeoSpec[];
  subcategorySlug: string;
};

function specValue(
  specs: readonly ArubaSeoSpec[],
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
    router: 'router',
    'access-point': 'Access Point',
    kommutator: 'kommutator',
    'sfp-modullar': 'SFP modul',
    'sebeke-aksesuarlari': 'şəbəkə aksesuarı',
  };
  return bySlug[subcategorySlug] ?? 'şəbəkə avadanlığı';
}

function specSnippet(specs: readonly ArubaSeoSpec[]): string | null {
  const preferred = [
    specValue(specs, (label) => label === 'tip'),
    specValue(specs, (label) => label.startsWith('port')),
    specValue(specs, (label) => label.startsWith('uplink')),
    specValue(specs, (label) => label === 'poe' || label.startsWith('poe')),
    specValue(
      specs,
      (label) => label.startsWith('wi-fi') || label === 'standart',
    ),
    specValue(specs, (label) => label.startsWith('uzunluq')),
    specValue(
      specs,
      (label) => label.startsWith('məsafə') || label.startsWith('mesafe'),
    ),
  ].filter((value): value is string => value !== null);
  if (preferred.length === 0) {
    return null;
  }
  return preferred.slice(0, 2).join(', ');
}

function seoTitleFor(input: ArubaSeoInput): string {
  const sku = normalizeArubaSku(input.sku);
  const model = arubaDisplayModel(
    sku,
    input.title,
    input.specs,
    input.subcategorySlug,
  );
  const core =
    model === ''
      ? input.title.trim() || `Aruba ${sku}`
      : `Aruba ${model}`.replace(/\s+/g, ' ').trim();
  const withSku = `${core} (${sku})`.replace(/\s+/g, ' ').trim();
  if (withSku.length <= SEO_TITLE_SOFT_MAX) {
    return withSku;
  }
  return clampSeoText(`Aruba ${sku}`, SEO_TITLE_SOFT_MAX);
}

export function resolveArubaProductSeo(input: ArubaSeoInput): ArubaSeoCopy {
  const sku = normalizeArubaSku(input.sku);
  const kind = kindLabel(input.subcategorySlug);
  const snippet = specSnippet(input.specs);
  const title = input.title.trim();

  const descriptionParts = [
    `Aruba ${sku}: ${snippet ?? kind}.`,
    `Orijinal Aruba ${kind}, rəsmi zəmanət və çatdırılma.`,
  ];
  let seoDescription = descriptionParts.join(' ');
  if (seoDescription.length < 140) {
    seoDescription = `${seoDescription} Kataloqda orijinal model, rəsmi zəmanətlə satılır.`;
  }
  if (seoDescription.length < 140) {
    seoDescription = `${seoDescription} Aruba şəbəkə avadanlığı rəsmi zəmanətlə təqdim olunur.`;
  }

  const introBits = [
    `${title} (${sku}) orijinal Aruba ${kind}dir.`,
    snippet ? `${snippet}.` : null,
    'Ofis və şəbəkə infrastrukturu üçün nəzərdə tutulub.',
    'Orijinal Aruba modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  ].filter((part): part is string => part !== null);

  return {
    seoTitle: seoTitleFor(input),
    seoDescription: clampSeoText(seoDescription, SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(introBits.join(' '), 700),
  };
}

export function buildArubaProductDescription(
  pageIntro: string,
  specs: readonly ArubaSeoSpec[],
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
