/**
 * OneScreen catalog names: brand + series + size/type.
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 * Same marketing panel may appear under several supplier SKUs; each P/N
 * stays a separate product so prices are not overwritten.
 */

const ONESCREEN_SKU_ALIASES: Record<string, string> = {
  ONESCREENCAST: 'ONESCREENCAST',
  ONESCREENWEBCAM: 'ONESCREENWEBCAM',
};

const ONESCREEN_CATALOG_NAMES: Record<string, string> = {
  PANEL55: 'OneScreen TL7 55" interaktiv lövhə',
  'T7-65': 'OneScreen T7 65" interaktiv lövhə',
  PANEL75: 'OneScreen T7 75" interaktiv lövhə (Panel75)',
  'T7-75': 'OneScreen T7 75" interaktiv lövhə',
  'OS-T7-75': 'OneScreen T7 75" interaktiv lövhə (OS-T7-75)',
  PANEL86: 'OneScreen T7 86" interaktiv lövhə (Panel86)',
  'T7-86': 'OneScreen T7 86" interaktiv lövhə',
  'OS-T7-86': 'OneScreen T7 86" interaktiv lövhə (OS-T7-86)',
  CORE65: 'OneScreen Core 65" interaktiv lövhə',
  CORE75: 'OneScreen Core 75" interaktiv lövhə',
  CORE86: 'OneScreen Core 86" interaktiv lövhə',
  'ONESCREEN-I5-L7': 'OneScreen OPS PC i5 16GB/256GB (T7)',
  'ONESCREEN-I7-L7': 'OneScreen OPS PC i7 16GB/256GB (T7)',
  'OS-MOBILE-CART': 'OneScreen mobil stend (86"-dək)',
  ONESCREENCAST: 'OneScreen Cast simsiz ekran paylaşımı',
  ONESCREENWEBCAM: 'OneScreen TrackCam 4K EPTZ kamera',
};

export type OneScreenNameSpec = {
  label: string;
  value: string;
};

export function normalizeOneScreenSku(model: string): string {
  const folded = model
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/\//g, '-')
    .replace(/[^A-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ONESCREEN_SKU_ALIASES[folded] ?? folded;
}

export function listOneScreenCatalogNameSkus(): string[] {
  return Object.keys(ONESCREEN_CATALOG_NAMES);
}

export function onescreenDisplayModel(
  sku: string,
  fallbackTitle: string,
): string {
  return resolveOneScreenCatalogName(sku, fallbackTitle)
    .replace(/^OneScreen\s+/i, '')
    .trim();
}

export function resolveOneScreenCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const catalogName = ONESCREEN_CATALOG_NAMES[normalizeOneScreenSku(sku)];
  if (catalogName !== undefined) {
    return catalogName;
  }
  const trimmed = fallbackTitle.trim();
  if (/^onescreen\b/i.test(trimmed)) {
    return trimmed;
  }
  return `OneScreen ${trimmed}`.trim();
}
