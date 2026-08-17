/**
 * Mirsan catalog names: brand + series + size/type.
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 * Plus in PDU part numbers is folded to hyphen so SKUs stay unique.
 */

const MIRSAN_CATALOG_NAMES: Record<string, string> = {
  'MR.FAN2WT.01': 'Mirsan 2-fan analog termostatlı ventilyator paneli',
  'MR.WTC12U66MN.02':
    'Mirsan WTC Com-Box 12U 600×600 divar şkafı (boz, yığılı)',
  'MR.WTC09U66MN.02': 'Mirsan WTC Com-Box 9U 600×600 divar şkafı (boz, yığılı)',
  'MR.GTN42U61.01_PRF63':
    'Mirsan GTN 42U 600×1000 şəbəkə şkafı (perforasiya 63%)',
  'MR.HD.GTN42U81.01_PRF63':
    'Mirsan GTN 42U 800×1000 şəbəkə şkafı (perforasiya 63%)',
  'MR.GTS42U812.01': 'Mirsan GTS 42U 800×1200 server şkafı',
  'MR.PRZ1U10O.PRFR.SC': 'Mirsan Basic PDU 1U 10×Schuko, surge, açar, 16A',
  'MR.PRZ42U2412D.SC': 'Mirsan Basic PDU 42U 24×Schuko, 16A, MCB',
  'MR.PRZ42U20XC13-4XC19': 'Mirsan Basic PDU 42U 20×C13+4×C19, V/A, 16A',
  'MR.PRZ42U20XC13-4XC19.AMP.PDU':
    'Mirsan Basic PDU 42U 20×C13+4×C19, V/A, 32A',
  'MR.PRZ42U2422D.SC': 'Mirsan Basic PDU 42U 24×Schuko, 32A, MCB',
  'MR.PRZ42U24P.C13': 'Mirsan Basic PDU 42U 20×C13+4×C19, 32A, 2×16A MCB',
  'MR.PRZ42U24D.SC': 'Mirsan Basic PDU 42U 24×Schuko, 32A, 2×16A MCB',
  'MR.PRZ42U24D.MCB.IE': 'Mirsan Basic PDU 42U 20×C13+4×C19, 32A, MCB',
};

/** Compact SKU-builder input: the 32A metered PDU would otherwise collide. */
const MIRSAN_GENERATOR_MODELS: Record<string, string> = {
  'MR.PRZ42U20XC13-4XC19.AMP.PDU': 'PRZ42U-C13-32A',
};

export type MirsanNameSpec = {
  label: string;
  value: string;
};

export function normalizeMirsanSku(model: string): string {
  return model
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/\+/g, '-')
    .replace(/\//g, '-')
    .replace(/[^A-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function mirsanSkuForGenerator(model: string): string {
  const sku = normalizeMirsanSku(model);
  return MIRSAN_GENERATOR_MODELS[sku] ?? sku;
}

export function listMirsanCatalogNameSkus(): string[] {
  return Object.keys(MIRSAN_CATALOG_NAMES);
}

export function mirsanDisplayModel(sku: string, fallbackTitle: string): string {
  return resolveMirsanCatalogName(sku, fallbackTitle)
    .replace(/^Mirsan\s+/i, '')
    .trim();
}

export function resolveMirsanCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const catalogName = MIRSAN_CATALOG_NAMES[normalizeMirsanSku(sku)];
  if (catalogName !== undefined) {
    return catalogName;
  }
  const trimmed = fallbackTitle.trim();
  if (/^mirsan\b/i.test(trimmed)) {
    return trimmed;
  }
  return `Mirsan ${trimmed}`.trim();
}
