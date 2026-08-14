/**
 * Grandstream catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';
import {
  grandstreamDisplayModel,
  inferGrandstreamSubcategorySlug,
  normalizeGrandstreamSku,
} from './grandstream-product-name';

export type GrandstreamSeoSpec = {
  label: string;
  value: string;
};

export type GrandstreamSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type GrandstreamSeoInput = {
  sku: string;
  title: string;
  specs: readonly GrandstreamSeoSpec[];
  subcategorySlug: string;
};

function specValue(
  specs: readonly GrandstreamSeoSpec[],
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

function kindLabel(subcategorySlug: string, sku: string): string {
  if (sku === 'DP755') {
    return 'IP DECT baza stansiyası';
  }
  if (subcategorySlug === 'sfp-modullar') {
    return sku.includes('10G') ? 'SFP+ modul' : 'SFP modul';
  }
  const bySlug: Record<string, string> = {
    router: 'router',
    'access-point': 'Access Point',
    kommutator: 'kommutator',
    'ip-telefon': 'IP telefon',
    'ip-video-telefon': 'IP Video telefon',
    'ip-dect-telefon': 'IP DECT telefon',
    'ip-wi-fi-telefon': 'IP Wi-Fi telefon',
    'ip-konfrans-telefonu': 'IP Konfrans telefonu',
    'ip-pbx': 'IP PBX',
    'ip-telefon-aksesuarlari': 'IP telefon aksesuarı',
    'sebeke-aksesuarlari': 'şəbəkə aksesuarı',
  };
  return bySlug[subcategorySlug] ?? 'şəbəkə avadanlığı';
}

function specSnippet(specs: readonly GrandstreamSeoSpec[]): string | null {
  const preferred = [
    specValue(specs, (label) => label === 'tip'),
    specValue(specs, (label) => label.startsWith('port')),
    specValue(specs, (label) => label.startsWith('xətlər') || label === 'sip'),
    specValue(specs, (label) => label === 'wi-fi' || label.startsWith('wi-fi')),
    specValue(specs, (label) => label === 'poe' || label.startsWith('poe')),
    specValue(specs, (label) => label.startsWith('ekran')),
    specValue(specs, (label) => label.startsWith('sürət')),
    specValue(specs, (label) => label.startsWith('çıxış')),
  ].filter((value): value is string => value !== null);
  if (preferred.length === 0) {
    return null;
  }
  return preferred.slice(0, 2).join(', ');
}

export function resolveGrandstreamProductSeo(
  input: GrandstreamSeoInput,
): GrandstreamSeoCopy {
  const sku = normalizeGrandstreamSku(input.sku);
  const subcategorySlug =
    input.subcategorySlug.trim() === ''
      ? inferGrandstreamSubcategorySlug(sku)
      : input.subcategorySlug;
  const kind = kindLabel(subcategorySlug, sku);
  const model = grandstreamDisplayModel(sku);
  const snippet = specSnippet(input.specs);

  const seoTitle = clampSeoText(
    input.title.trim() || `Grandstream ${model} ${kind}`,
    SEO_TITLE_SOFT_MAX,
  );

  const descriptionParts = [
    `Grandstream ${sku}: ${snippet ?? kind}.`,
    `Orijinal Grandstream ${kind}, rəsmi zəmanət və çatdırılma.`,
  ];
  let seoDescription = descriptionParts.join(' ');
  if (seoDescription.length < 140) {
    seoDescription = `${seoDescription} Kataloqda orijinal model, rəsmi zəmanətlə satılır.`;
  }

  const introBits = [
    `${input.title.trim()} (${sku}) orijinal Grandstream ${kind}dir.`,
    snippet ? `${snippet}.` : null,
    'Ofis, hotel və şəbəkə infrastrukturu üçün nəzərdə tutulub.',
    'Orijinal Grandstream modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  ].filter((part): part is string => part !== null);

  return {
    seoTitle,
    seoDescription: clampSeoText(seoDescription, SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(introBits.join(' '), 700),
  };
}

export function buildGrandstreamProductDescription(
  pageIntro: string,
  specs: readonly GrandstreamSeoSpec[],
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
