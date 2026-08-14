/**
 * Hand-crafted ENOT UPS battery SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';
import { normalizeEnotSku } from './enot-product-name';

export type EnotSeoSpec = {
  label: string;
  value: string;
};

export type EnotSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type EnotSeoInput = {
  sku: string;
  title: string;
  specs: readonly EnotSeoSpec[];
  subcategorySlug: string;
};

type EnotSeoDraft = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

const HANDCRAFTED_ENOT_SEO: Record<string, EnotSeoDraft> = {
  'NP12-12': {
    seoTitle: 'ENOT NP12-12 12V 12Ah UPS batareyası',
    seoDescription:
      'ENOT NP12-12: 12 V 12 Ah AGM/VRLA hermetik UPS batareyası. Siqnalizasiya və ehtiyat qidalanma üçün orijinal ENOT, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'ENOT NP12-12 (NP12-12) 12 V / 12 Ah AGM/VRLA hermetik qurğuşun-turşu UPS batareyasıdır. Faston (F2/T2) terminallar, 151 × 98 × 96 mm ölçü və təxminən 3,1–3,65 kq çəki ilə üfüqi və ya şaquli quraşdırılır. UPS, siqnalizasiya və ehtiyat qidalanma üçün texniki xidmət tələb etmir. Orijinal ENOT NP seriyasıdır; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'NP5.0-12': {
    seoTitle: 'ENOT NP5.0-12 12V 5Ah UPS batareyası',
    seoDescription:
      'ENOT NP5.0-12: 12 V 5 Ah kompakt AGM/VRLA hermetik UPS batareyası. Kiçik UPS və siqnalizasiya üçün orijinal ENOT, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'ENOT NP5.0-12 (NP5.0-12) 12 V / 5 Ah AGM/VRLA hermetik qurğuşun-turşu UPS batareyasıdır. 90 × 70 × 101 mm kompakt korpus və təxminən 1,4 kq çəki kiçik UPS, siqnalizasiya və ehtiyat qidalanma üçün uyğundur. Hermetik SLA texnologiyası texniki xidmət tələb etmir; üfüqi və ya şaquli quraşdırılır. Orijinal ENOT NP seriyasıdır, rəsmi zəmanət və çatdırılma ilə.',
  },
  'NP7.0-12': {
    seoTitle: 'ENOT NP7.0-12 12V 7Ah UPS batareyası',
    seoDescription:
      'ENOT NP7.0-12: 12 V 7 Ah AGM/VRLA hermetik UPS batareyası. Ofis UPS-lərinin ən yayğın əvəzedicisi, orijinal ENOT, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'ENOT NP7.0-12 (NP7.0-12) 12 V / 7 Ah AGM/VRLA hermetik qurğuşun-turşu UPS batareyasıdır. T2 Faston terminallar, 151 × 65 × 100 mm ölçü və təxminən 2,1 kq çəki ofis UPS-lərinin əksəriyyətinə uyğundur. Hermetik SLA kimyası texniki xidmət tələb etmir; siqnalizasiya və ehtiyat qidalanma üçün də istifadə olunur. Orijinal ENOT NP seriyasıdır; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'NP7.5-12': {
    seoTitle: 'ENOT NP7.5-12 12V 7.5Ah UPS batareyası',
    seoDescription:
      'ENOT NP7.5-12: 12 V 7,5 Ah AGM/VRLA hermetik UPS batareyası. 7 Ah korpusunda daha tutumlu orijinal ENOT əvəzedici, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'ENOT NP7.5-12 (NP7.5-12) 12 V / 7,5 Ah AGM/VRLA hermetik qurğuşun-turşu UPS batareyasıdır. Faston (F1/F2) terminallar, 151 × 65 × təxminən 97–100 mm ölçü və 2,2 kq çəki 7 Ah korpusuna yaxın UPS-lərdə tutumu artırır. Hermetik SLA texnologiyası texniki xidmət tələb etmir; UPS, siqnalizasiya və ehtiyat qidalanma üçündür. Orijinal ENOT NP seriyasıdır, rəsmi zəmanət və çatdırılma ilə.',
  },
};

function specValue(
  specs: readonly EnotSeoSpec[],
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

function fallbackSeoCopy(input: EnotSeoInput): EnotSeoCopy {
  const sku = normalizeEnotSku(input.sku);
  const voltage = specValue(input.specs, (label) => label.startsWith('gərgin'));
  const capacity = specValue(input.specs, (label) => label.startsWith('tutum'));

  const seoTitle = clampSeoText(
    `ENOT ${sku} UPS batareyası`.replace(/\s+/g, ' ').trim(),
    SEO_TITLE_SOFT_MAX,
  );

  const parts = [
    `${input.title.trim()} (${sku}) — orijinal ENOT UPS batareyası.`,
    voltage ? `Gərginlik: ${voltage}.` : null,
    capacity ? `Tutum: ${capacity}.` : null,
    'Rəsmi zəmanət və çatdırılma.',
  ].filter((part): part is string => part !== null);

  return {
    seoTitle,
    seoDescription: clampSeoText(parts.join(' '), SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(parts.join(' '), 700),
  };
}

export function resolveEnotProductSeo(input: EnotSeoInput): EnotSeoCopy {
  const sku = normalizeEnotSku(input.sku);
  const crafted = HANDCRAFTED_ENOT_SEO[sku];
  if (crafted === undefined) {
    return fallbackSeoCopy(input);
  }
  return {
    seoTitle: crafted.seoTitle,
    seoDescription: crafted.seoDescription,
    pageIntro: crafted.pageIntro,
  };
}

export function buildEnotProductDescription(
  pageIntro: string,
  specs: readonly EnotSeoSpec[],
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

export function listHandcraftedEnotSkus(): string[] {
  return Object.keys(HANDCRAFTED_ENOT_SEO);
}
