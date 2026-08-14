/**
 * ENOT UPS battery catalog names: brand + model + voltage/capacity.
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 */

const ENOT_CATALOG_NAMES: Record<string, string> = {
  'NP12-12': 'ENOT NP12-12 12V 12Ah UPS batareyası',
  'NP5.0-12': 'ENOT NP5.0-12 12V 5Ah UPS batareyası',
  'NP7.0-12': 'ENOT NP7.0-12 12V 7Ah UPS batareyası',
  'NP7.5-12': 'ENOT NP7.5-12 12V 7.5Ah UPS batareyası',
};

export function normalizeEnotSku(model: string): string {
  return model
    .trim()
    .toUpperCase()
    .replace(/\/AZ$/i, '')
    .replace(/\//g, '-');
}

export function listEnotCatalogNameSkus(): string[] {
  return Object.keys(ENOT_CATALOG_NAMES);
}

export function resolveEnotCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const catalogName = ENOT_CATALOG_NAMES[normalizeEnotSku(sku)];
  if (catalogName !== undefined) {
    return catalogName;
  }
  const trimmed = fallbackTitle.trim();
  if (/^enot\b/i.test(trimmed)) {
    return trimmed.replace(/\bbattery\b/gi, 'UPS batareyası').trim();
  }
  return `ENOT ${trimmed}`.trim();
}
