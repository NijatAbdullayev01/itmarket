/**
 * Yandex catalog names: keep the Azerbaijani Excel title, ensure the brand prefix.
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
  const withoutColor = raw.replace(/,\s*[^,]+$/u, '').trim();
  return withoutColor === '' ? raw : withoutColor;
}

export function resolveYandexCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const trimmed = fallbackTitle.trim();
  if (trimmed === '') {
    return `Yandex ${normalizeYandexSku(sku)}`;
  }
  if (/^yandex\b/i.test(trimmed)) {
    return trimmed;
  }
  return `Yandex ${trimmed}`.trim();
}
