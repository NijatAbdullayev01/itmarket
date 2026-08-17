/**
 * Yandex catalog names: keep the Azerbaijani Excel title, ensure the brand prefix.
 * Compact manufacturer codes (YNDX-00020-BLACK) stay in Model / Part number, not name.
 */

export type YandexNameSpec = {
  label: string;
  value: string;
};

export function normalizeYandexSku(model: string): string {
  return model
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Compact Yandex codes such as YNDX-00020-BLACK (no spaces, has a digit). */
export function isYandexCompactCodeName(value: string): boolean {
  const token = value.trim();
  if (token === '' || /\s/.test(token)) {
    return false;
  }
  return /\d/.test(token) && token.length <= 40;
}

export function ensureYandexModelSpec(
  specs: readonly YandexNameSpec[],
  modelCode: string,
): YandexNameSpec[] {
  const code = normalizeYandexSku(modelCode);
  if (code === '') {
    return specs.map((entry) => ({ ...entry }));
  }
  let replaced = false;
  const next = specs.map((entry) => {
    const label = entry.label.toLocaleLowerCase('az');
    if (label !== 'model' && label !== 'part number') {
      return { ...entry };
    }
    replaced = true;
    return {
      label: label === 'part number' ? 'Part number' : entry.label,
      value: code,
    };
  });
  if (!replaced) {
    next.unshift({ label: 'Model', value: code });
  }
  return next;
}

/**
 * Prefer Excel/marketing title when the stored/fallback value is only a code.
 */
export function preferYandexMarketingTitle(
  marketingTitle: string,
  compactOrTitle: string,
): string {
  const marketing = marketingTitle.trim();
  const candidate = compactOrTitle.trim();
  if (marketing !== '' && isYandexCompactCodeName(candidate)) {
    return marketing;
  }
  if (candidate !== '' && !isYandexCompactCodeName(candidate)) {
    return candidate;
  }
  return marketing;
}

function specValue(
  specs: readonly YandexNameSpec[],
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

function stripLeadingBrand(title: string): string {
  return title.replace(/^Yandex\s+/i, '').trim();
}

export function yandexDisplayModel(
  title: string,
  specs: readonly YandexNameSpec[] = [],
): string {
  const series = specValue(specs, (label) => label === 'seriya');
  if (series !== null) {
    const withoutBrand = stripLeadingBrand(series);
    const withoutParen = withoutBrand.replace(/\s*\([^)]*\)\s*$/u, '').trim();
    if (withoutParen !== '') {
      return withoutParen;
    }
  }

  const raw = stripLeadingBrand(title);
  if (isYandexCompactCodeName(raw)) {
    return raw;
  }
  const withoutColor = raw.replace(/,\s*[^,]+$/u, '').trim();
  return withoutColor === '' ? raw : withoutColor;
}

export function resolveYandexCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const preferred = preferYandexMarketingTitle(fallbackTitle, fallbackTitle);
  const trimmed = preferred.trim();
  if (trimmed === '' || isYandexCompactCodeName(trimmed)) {
    return `Yandex ${normalizeYandexSku(sku)}`;
  }
  if (/^yandex\b/i.test(trimmed)) {
    return trimmed.replace(/^yandex\b/i, 'Yandex');
  }
  return `Yandex ${trimmed}`.trim();
}
