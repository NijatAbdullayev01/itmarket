/**
 * APC catalog names: marketing titles for UPS units and accessories; manufacturer
 * codes stay in Part number / Model so storefront shows "Marketing Name (CODE)".
 */

export type ApcNameSpec = {
  label: string;
  value: string;
};

/** Accessory PNs that must not stay as bare SKU titles. */
const APC_ACCESSORY_CATALOG_NAMES: Record<string, string> = {
  AP9544: 'APC AP9544 Easy UPS Network Management Card',
  AP9641: 'APC AP9641 Network Management Card 3',
};

/**
 * Trailing SERP junk only — strip longer phrases before shorter ones.
 * Keep real product descriptors (AVR, Schuko, On-Line UPS, SmartConnect, …).
 * "UPS Modeli" → drop only trailing "Modeli" so "On-Line UPS" remains.
 */
const APC_SEO_JUNK_SUFFIXES = [
  'modelini al',
  'fasiləsiz qida mənbəyi',
  'qiyməti',
  'modeli',
  'al',
] as const;

export function normalizeApcSku(model: string): string {
  return model
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Compact UPS / accessory codes such as BV1000I-GR, SRV10KI (no spaces, has a digit). */
export function isApcCompactCodeName(value: string): boolean {
  const token = value.trim();
  if (token === '' || /\s/.test(token)) {
    return false;
  }
  return /\d/.test(token) && token.length <= 40;
}

export function isApcAccessoryOpaqueName(value: string): boolean {
  const sku = normalizeApcSku(value);
  return Object.prototype.hasOwnProperty.call(APC_ACCESSORY_CATALOG_NAMES, sku);
}

export function listApcAccessoryCatalogNameSkus(): string[] {
  return Object.keys(APC_ACCESSORY_CATALOG_NAMES);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Strip SERP suffixes (Al, Qiyməti, Modelini Al, UPS Modeli, …) from Excel/seo titles. */
export function cleanApcMarketingTitle(title: string): string {
  let result = title
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,(?=\S)/g, ', ');

  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of APC_SEO_JUNK_SUFFIXES) {
      const next = result
        .replace(new RegExp(`\\s+${escapeRegExp(suffix)}$`, 'i'), '')
        .trim();
      if (next !== result) {
        result = next;
        changed = true;
      }
    }
  }

  return result;
}

function ensureApcBrandPrefix(title: string): string {
  const trimmed = title.trim().replace(/\s+/g, ' ');
  if (trimmed === '') {
    return trimmed;
  }
  if (/^apc\b/i.test(trimmed)) {
    return trimmed.replace(/^apc\b/i, 'APC');
  }
  return `APC ${trimmed}`;
}

/**
 * Prefer Excel/marketing title when the stored/fallback value is only a code.
 */
export function preferApcMarketingTitle(
  marketingTitle: string,
  compactOrTitle: string,
): string {
  const marketing = cleanApcMarketingTitle(marketingTitle);
  const candidate = compactOrTitle.trim();
  if (marketing !== '' && isApcCompactCodeName(candidate)) {
    return marketing;
  }
  if (candidate !== '' && !isApcCompactCodeName(candidate)) {
    return cleanApcMarketingTitle(candidate);
  }
  return marketing;
}

export function ensureApcPartNumberSpec(
  specs: readonly ApcNameSpec[],
  partNumber: string,
): ApcNameSpec[] {
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

export function ensureApcModelSpec(
  specs: readonly ApcNameSpec[],
  modelCode: string,
): ApcNameSpec[] {
  const code = modelCode.trim();
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

/**
 * Accessories → fixed marketing map. UPS / other models → cleaned marketing
 * title from Excel/seo (never leave the bare manufacturer code as the name).
 */
export function resolveApcCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const normalized = normalizeApcSku(sku);
  const catalogName = APC_ACCESSORY_CATALOG_NAMES[normalized];
  if (catalogName !== undefined) {
    return catalogName;
  }

  const preferred = preferApcMarketingTitle(fallbackTitle, fallbackTitle);
  if (preferred !== '' && !isApcCompactCodeName(preferred)) {
    return ensureApcBrandPrefix(preferred);
  }

  if (normalized !== '') {
    return `APC ${normalized}`;
  }
  const trimmed = fallbackTitle.trim();
  if (trimmed === '') {
    return 'APC';
  }
  return ensureApcBrandPrefix(trimmed);
}
