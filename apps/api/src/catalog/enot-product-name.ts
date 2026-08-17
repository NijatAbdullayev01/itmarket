/**
 * ENOT UPS battery catalog names: brand + model + voltage/capacity.
 * Compact codes (NP5.0-12) stay in Model, not product.name.
 */

export type EnotNameSpec = {
  label: string;
  value: string;
};

const ENOT_CATALOG_NAMES: Record<string, string> = {
  'NP12-12': 'ENOT NP12-12 12V 12Ah UPS batareyası',
  'NP5.0-12': 'ENOT NP5.0-12 12V 5Ah UPS batareyası',
  'NP7.0-12': 'ENOT NP7.0-12 12V 7Ah UPS batareyası',
  'NP7.5-12': 'ENOT NP7.5-12 12V 7.5Ah UPS batareyası',
};

export function normalizeEnotSku(model: string): string {
  return model.trim().toUpperCase().replace(/\/AZ$/i, '').replace(/\//g, '-');
}

/** Compact ENOT codes such as NP5.0-12 (no spaces, has a digit). */
export function isEnotCompactCodeName(value: string): boolean {
  const token = value.trim();
  if (token === '' || /\s/.test(token)) {
    return false;
  }
  return /\d/.test(token) && token.length <= 40;
}

export function ensureEnotModelSpec(
  specs: readonly EnotNameSpec[],
  modelCode: string,
): EnotNameSpec[] {
  const code = normalizeEnotSku(modelCode);
  if (code === '') {
    return specs.map((entry) => ({ ...entry }));
  }
  let replaced = false;
  const next = specs.map((entry) => {
    if (entry.label.toLocaleLowerCase('az') !== 'model') {
      return { ...entry };
    }
    replaced = true;
    return { label: entry.label, value: code };
  });
  if (!replaced) {
    next.unshift({ label: 'Model', value: code });
  }
  return next;
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
  if (trimmed === '' || isEnotCompactCodeName(trimmed)) {
    return `ENOT ${normalizeEnotSku(sku)}`;
  }
  if (/^enot\b/i.test(trimmed)) {
    return trimmed.replace(/\bbattery\b/gi, 'UPS batareyası').trim();
  }
  return `ENOT ${trimmed}`.trim();
}
