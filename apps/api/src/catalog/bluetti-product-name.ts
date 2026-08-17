/**
 * Bluetti catalog names: brand + model + short type/power.
 * Compact manufacturer codes (AC180P) stay in Model, not product.name.
 */

export type BluettiNameSpec = {
  label: string;
  value: string;
};

const BLUETTI_CATALOG_NAMES: Record<string, string> = {
  AC180P: 'Bluetti AC180P 1800W enerji stansiyası',
  AC200PL: 'Bluetti AC200PL 2400W genişlənən stansiya',
  AC2P: 'Bluetti AC2P 300W kompakt stansiya',
  AC50P: 'Bluetti AC50P 700W enerji stansiyası',
  AC70P: 'Bluetti AC70P 1000W enerji stansiyası',
  MP200: 'Bluetti MP200 200W günəş paneli',
  PV120: 'Bluetti PV120 120W günəş paneli',
  PV350: 'Bluetti PV350 350W günəş paneli',
};

export function normalizeBluettiSku(model: string): string {
  return model
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Compact Bluetti codes such as AC180P / PV120 (no spaces, has a digit). */
export function isBluettiCompactCodeName(value: string): boolean {
  const token = value.trim();
  if (token === '' || /\s/.test(token)) {
    return false;
  }
  return /\d/.test(token) && token.length <= 40;
}

export function ensureBluettiModelSpec(
  specs: readonly BluettiNameSpec[],
  modelCode: string,
): BluettiNameSpec[] {
  const code = normalizeBluettiSku(modelCode);
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

export function listBluettiCatalogNameSkus(): string[] {
  return Object.keys(BLUETTI_CATALOG_NAMES);
}

export function resolveBluettiCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const catalogName = BLUETTI_CATALOG_NAMES[normalizeBluettiSku(sku)];
  if (catalogName !== undefined) {
    return catalogName;
  }
  const trimmed = fallbackTitle.trim().replace(/\s+/g, ' ');
  if (trimmed === '' || isBluettiCompactCodeName(trimmed)) {
    return `Bluetti ${normalizeBluettiSku(sku)}`;
  }
  if (/^bluetti\b/i.test(trimmed)) {
    return trimmed.replace(/^bluetti\b/i, 'Bluetti');
  }
  return `Bluetti ${trimmed}`.trim();
}
