/**
 * Transcend catalog names: brand + marketing series + capacity + short type.
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 */

export type TranscendNameSpec = {
  label: string;
  value: string;
};

const TRANSCEND_CATALOG_NAMES: Record<string, string> = {
  TS1TESD410C: 'Transcend ESD410C 1TB xarici SSD',
  TS2TESD410C: 'Transcend ESD410C 2TB xarici SSD',
  TS500GESD380C: 'Transcend ESD380C 500GB xarici SSD',
  TS1TESD380C: 'Transcend ESD380C 1TB xarici SSD',
  TS2TESD380C: 'Transcend ESD380C 2TB xarici SSD',
  TS500GESD265C: 'Transcend ESD265C 500GB xarici SSD',
  TS1TESD265C: 'Transcend ESD265C 1TB xarici SSD',
  TS512GESD310C: 'Transcend ESD310C 512GB xarici SSD',
  TS250GESD270C: 'Transcend ESD270C 250GB xarici SSD',
  TS500GESD270C: 'Transcend ESD270C 500GB xarici SSD',
  TS1TSJ25M3S: 'Transcend StoreJet 25M3S 1TB xarici HDD',
  TS1TSJ25M3G: 'Transcend StoreJet 25M3G 1TB xarici HDD',
  TS2TSJ25M3S: 'Transcend StoreJet 25M3S 2TB xarici HDD',
  TS2TSJ25M3G: 'Transcend StoreJet 25M3G 2TB xarici HDD',
  TS1TSJ25H3B: 'Transcend StoreJet 25H3B 1TB xarici HDD',
};

export function normalizeTranscendSku(model: string): string {
  return model
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Compact Excel model codes such as TS1TESD265C (no spaces). */
export function isTranscendCompactCodeName(value: string): boolean {
  const token = value.trim();
  if (token === '' || /\s/.test(token)) {
    return false;
  }
  return /^TS[A-Z0-9]+$/i.test(token);
}

export function ensureTranscendPartNumberSpec(
  specs: readonly TranscendNameSpec[],
  partNumber: string,
): TranscendNameSpec[] {
  const code = partNumber.trim();
  if (code === '') {
    return specs.map((entry) => ({ ...entry }));
  }
  let replaced = false;
  const next = specs.map((entry) => {
    const label = entry.label.toLocaleLowerCase('az');
    if (label !== 'part number' && label !== 'part nömrəsi') {
      return { ...entry };
    }
    replaced = true;
    return { label: 'Part number', value: code };
  });
  if (!replaced) {
    next.unshift({ label: 'Part number', value: code });
  }
  return next;
}

export function listTranscendCatalogNameSkus(): string[] {
  return Object.keys(TRANSCEND_CATALOG_NAMES);
}

export function resolveTranscendCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const catalogName = TRANSCEND_CATALOG_NAMES[normalizeTranscendSku(sku)];
  if (catalogName !== undefined) {
    return catalogName;
  }
  const trimmed = fallbackTitle.trim();
  if (/^transcend\b/i.test(trimmed)) {
    return trimmed;
  }
  return `Transcend ${trimmed}`.trim();
}
