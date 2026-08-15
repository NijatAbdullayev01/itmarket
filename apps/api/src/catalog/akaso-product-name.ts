/**
 * AKASO catalog names: brand + marketing model + short type.
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 */

const AKASO_CATALOG_NAMES: Record<string, string> = {
  'AKASO360-CREATOR-COMBO': 'AKASO 360 Creator Combo 360° kamera',
  'BRAVE-8-SPORT-COMBO': 'AKASO Brave 8 Sport Combo ekşn kamera',
  'BRAVE-4-PRO-SPORT-COMBO': 'AKASO Brave 4 Pro Sport Combo ekşn kamera',
  'V50-ELITE': 'AKASO V50 Elite ekşn kamera',
  'BRAVE-4': 'AKASO Brave 4 ekşn kamera',
};

export function normalizeAkasoSku(model: string): string {
  return model
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function listAkasoCatalogNameSkus(): string[] {
  return Object.keys(AKASO_CATALOG_NAMES);
}

export function resolveAkasoCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const catalogName = AKASO_CATALOG_NAMES[normalizeAkasoSku(sku)];
  if (catalogName !== undefined) {
    return catalogName;
  }
  const trimmed = fallbackTitle.trim();
  if (/^akaso\b/i.test(trimmed)) {
    return trimmed;
  }
  return `AKASO ${trimmed}`.trim();
}
