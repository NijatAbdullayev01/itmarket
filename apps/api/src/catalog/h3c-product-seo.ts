/**
 * H3C catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';
import {
  h3cDisplayModel,
  normalizeH3cSku,
  type H3cNameSpec,
} from './h3c-product-name';

export type H3cSeoSpec = H3cNameSpec;

export type H3cSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type H3cSeoInput = {
  sku: string;
  title: string;
  specs: readonly H3cSeoSpec[];
  subcategorySlug: string;
};

function specValue(
  specs: readonly H3cSeoSpec[],
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
  if (subcategorySlug === 'sfp-modullar') {
    if (/sfp28/.test(hay)) {
      return 'SFP28 modul';
    }
    if (/sfp\+/.test(hay)) {
      return 'SFP+ modul';
    }
    return 'SFP modul';
  }
  const bySlug: Record<string, string> = {
    router: 'router',
    'access-point': 'Access Point',
    kommutator: 'kommutator',
    'sebeke-aksesuarlari': 'şəbəkə aksesuarı',
  };
  return bySlug[subcategorySlug] ?? 'şəbəkə avadanlığı';
}

function specSnippet(specs: readonly H3cSeoSpec[]): string | null {
  const preferred = [
    specValue(specs, (label) => label === 'tip'),
    specValue(specs, (label) => label.startsWith('port')),
    specValue(specs, (label) => label.startsWith('uplink')),
    specValue(specs, (label) => label === 'poe' || label.startsWith('poe')),
    specValue(
      specs,
      (label) => label.startsWith('sürət') || label.startsWith('suret'),
    ),
    specValue(specs, (label) => label.startsWith('uzunluq')),
    specValue(specs, (label) => label === 'güc' || label === 'guc'),
    specValue(
      specs,
      (label) => label.startsWith('məsafə') || label.startsWith('mesafe'),
    ),
    specValue(specs, (label) => label === 'standart'),
  ].filter((value): value is string => value !== null);
  if (preferred.length === 0) {
    return null;
  }
  return preferred.slice(0, 2).join(', ');
}

export function resolveH3cProductSeo(input: H3cSeoInput): H3cSeoCopy {
  const sku = normalizeH3cSku(input.sku);
  const kind = kindLabel(input.subcategorySlug, input.title);
  const model = h3cDisplayModel(sku, input.title, input.specs);
  const snippet = specSnippet(input.specs);

  const seoTitle = clampSeoText(
    input.title.trim() || `H3C ${model} ${kind}`,
    SEO_TITLE_SOFT_MAX,
  );

  const descriptionParts = [
    `H3C ${sku}: ${snippet ?? kind}.`,
    `Orijinal H3C ${kind}, rəsmi zəmanət və çatdırılma.`,
  ];
  let seoDescription = descriptionParts.join(' ');
  if (seoDescription.length < 140) {
    seoDescription = `${seoDescription} Kataloqda orijinal model, rəsmi zəmanətlə satılır.`;
  }
  if (seoDescription.length < 140) {
    seoDescription = `${seoDescription} H3C şəbəkə avadanlığı rəsmi zəmanətlə təqdim olunur.`;
  }

  const introBits = [
    `${input.title.trim()} (${sku}) orijinal H3C ${kind}dir.`,
    snippet ? `${snippet}.` : null,
    'Ofis, data mərkəzi və şəbəkə infrastrukturu üçün nəzərdə tutulub.',
    'Orijinal H3C modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  ].filter((part): part is string => part !== null);

  return {
    seoTitle,
    seoDescription: clampSeoText(seoDescription, SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(introBits.join(' '), 700),
  };
}

export function buildH3cProductDescription(
  pageIntro: string,
  specs: readonly H3cSeoSpec[],
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
