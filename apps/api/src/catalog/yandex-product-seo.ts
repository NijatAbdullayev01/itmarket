/**
 * Yandex catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';
import {
  normalizeYandexSku,
  yandexDisplayModel,
  type YandexNameSpec,
} from './yandex-product-name';

export type YandexSeoSpec = YandexNameSpec;

export type YandexSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type YandexSeoInput = {
  sku: string;
  title: string;
  specs: readonly YandexSeoSpec[];
  subcategorySlug: string;
};

function specValue(
  specs: readonly YandexSeoSpec[],
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
    'agilli-kolonka': 'ağıllı kolonka',
    'portativ-kolonka': 'portativ kolonka',
    'agilli-lampa': 'ağıllı lampa',
    'agilli-acar': 'ağıllı açar',
    'agilli-sensor': 'ağıllı sensor',
    'agilli-rozetka': 'ağıllı rozetka',
    'agilli-pult': 'ağıllı pult',
    'led-lent': 'LED lent',
    'agilli-ev-merkezi': 'ağıllı ev mərkəzi',
  };
  return bySlug[subcategorySlug] ?? 'Yandex məhsulu';
}

function specSnippet(specs: readonly YandexSeoSpec[]): string | null {
  const preferred = [
    specValue(specs, (label) => label === 'tip'),
    specValue(specs, (label) => label === 'seriya'),
    specValue(specs, (label) => label === 'səs gücü' || label === 'güc'),
    specValue(specs, (label) => label === 'rəng'),
    specValue(specs, (label) => label === 'zigbee'),
    specValue(specs, (label) => label === 'wi-fi' || label === 'wifi'),
  ].filter((value): value is string => value !== null);
  if (preferred.length === 0) {
    return null;
  }
  return preferred.slice(0, 2).join(', ');
}

function useCase(subcategorySlug: string): string {
  if (subcategorySlug === 'agilli-kolonka') {
    return 'Alisa ilə evdə musiqi, hava, taymer və ağıllı ev idarəsi üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'portativ-kolonka') {
    return 'Yolda, bağda və açıq havada Alisa ilə musiqi üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'agilli-lampa' || subcategorySlug === 'led-lent') {
    return 'Alisa ilə Ev tətbiqi üzərindən işıq səhnələri üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'agilli-acar') {
    return 'Divar açarını Alisa və ağıllı ev ssenarilərinə qoşmaq üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'agilli-sensor') {
    return 'Evdə hərəkət, qapı və ya iqlim hadisələrini Alisa-ya ötürmək üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'agilli-rozetka') {
    return 'Rozetkadakı cihazları Alisa ilə yandırmaq və söndürmək üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'agilli-pult') {
    return 'TV və audio avadanlığını Alisa ağıllı evə bağlamaq üçün nəzərdə tutulub.';
  }
  if (subcategorySlug === 'agilli-ev-merkezi') {
    return 'Zigbee cihazlarını Alisa ağıllı evə birləşdirən mərkəz kimi nəzərdə tutulub.';
  }
  return 'Alisa ilə Ev ağıllı ev ekosistemi üçün nəzərdə tutulub.';
}

function clockToken(specs: readonly YandexSeoSpec[]): string | null {
  const saat = specValue(specs, (label) => label === 'saat');
  if (saat === null) {
    return null;
  }
  const folded = saat.toLocaleLowerCase('az');
  if (folded === 'var' || folded === 'bəli') {
    return 'saatlı';
  }
  return null;
}

function buildSeoTitle(input: YandexSeoInput): string {
  const model = yandexDisplayModel(input.title, input.specs);
  const color = specValue(input.specs, (label) => label === 'rəng');
  const clock = clockToken(input.specs);
  const kind = kindLabel(input.subcategorySlug);
  const foldedModel = model.toLocaleLowerCase('az');
  const parts = [`Yandex ${model}`];
  if (clock !== null && !foldedModel.includes('saatlı')) {
    parts.push(clock);
  }
  let candidate = parts.join(' ');
  if (color !== null) {
    candidate = `${candidate}, ${color}`;
  } else if (!foldedModel.includes(kind.toLocaleLowerCase('az'))) {
    candidate = `${candidate} ${kind}`;
  }
  if (candidate.length < 24 && !/alisa/i.test(candidate)) {
    candidate = `${candidate}, Alisa`;
  }
  if (candidate.length <= SEO_TITLE_SOFT_MAX) {
    return candidate;
  }
  const compact =
    color !== null ? `Yandex ${model}, ${color}` : `Yandex ${model}`;
  return clampSeoText(compact, SEO_TITLE_SOFT_MAX);
}

export function resolveYandexProductSeo(input: YandexSeoInput): YandexSeoCopy {
  const sku = normalizeYandexSku(input.sku);
  const kind = kindLabel(input.subcategorySlug);
  const snippet = specSnippet(input.specs);
  const color = specValue(input.specs, (label) => label === 'rəng');

  const seoTitle = buildSeoTitle(input);

  const descriptionParts = [
    `Yandex ${sku}: ${snippet ?? kind}.`,
    color !== null ? `${color} rəng.` : null,
    `Orijinal Yandex ${kind}, rəsmi zəmanət və çatdırılma.`,
  ].filter((part): part is string => part !== null);
  let seoDescription = descriptionParts.join(' ');
  if (seoDescription.length < 140) {
    seoDescription = `${seoDescription} Alisa ilə Ev kataloqunda orijinal model satılır.`;
  }
  if (seoDescription.length < 140) {
    seoDescription = `${seoDescription} Yandex ağıllı ev avadanlığı rəsmi zəmanətlə təqdim olunur.`;
  }

  const introBits = [
    `${input.title.trim()} (${sku}) orijinal Yandex ${kind}dir.`,
    snippet ? `${snippet}.` : null,
    color !== null ? `Rəng: ${color}.` : null,
    useCase(input.subcategorySlug),
    'Orijinal Yandex modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  ].filter((part): part is string => part !== null);

  return {
    seoTitle,
    seoDescription: clampSeoText(seoDescription, SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(introBits.join(' '), 700),
  };
}

export function buildYandexProductDescription(
  pageIntro: string,
  specs: readonly YandexSeoSpec[],
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
