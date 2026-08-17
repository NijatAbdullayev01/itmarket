/**
 * Apacer catalog names: brand + series + capacity + short type/color.
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 *
 * AP1TBAS2280Q4U5-1 appears twice in the pricelist (PS5 heatsink installed
 * vs Standard). The PS5 row uses identity AS2280Q4U-1TB-PS5 so the
 * generated store SKU stays distinct from the Standard listing.
 */

export type ApacerNameSpec = {
  label: string;
  value: string;
};

const APACER_CATALOG_NAMES: Record<string, string> = {
  'AP512GAS2280Q4U5-1': 'Apacer AS2280Q4U 512GB M.2 NVMe (PS5)',
  'AS2280Q4U-1TB-PS5': 'Apacer AS2280Q4U 1TB M.2 NVMe (PS5)',
  'AP2TBAS2280Q4U5-1': 'Apacer AS2280Q4U 2TB M.2 NVMe (PS5)',
  'AP1TBAS2280Q4U5-1': 'Apacer AS2280Q4U 1TB M.2 NVMe (Standard)',
  AS16GGB32CSYBGH: 'Apacer 16GB DDR4 3200 SODIMM',
  'AP256GAS725B-1': 'Apacer AS725 256GB MagSafe xarici SSD',
  'AP512GAS725B-1': 'Apacer AS725 512GB MagSafe xarici SSD',
  'AP1TBAS725B-1': 'Apacer AS725 1TB MagSafe xarici SSD',
  'AP1TBAS723B-1': 'Apacer AS723 1TB xarici SSD',
  'AP2TBAS723B-1': 'Apacer AS723 2TB xarici SSD',
  'AP1TBAC237B-1': 'Apacer AC237 1TB xarici HDD (qara)',
  'AP1TBAC237U-1': 'Apacer AC237 1TB xarici HDD (mavi)',
  'AP1TBAC237R-1': 'Apacer AC237 1TB xarici HDD (qranat qırmızı)',
  'AP2TBAC237B-1': 'Apacer AC237 2TB xarici HDD (qara)',
  'AP2TBAC237U-1': 'Apacer AC237 2TB xarici HDD (mavi)',
  'AP2TBAC237R-1': 'Apacer AC237 2TB xarici HDD (qranat qırmızı)',
  'AP4TBAC533B-1': 'Apacer AC533 4TB xarici HDD (qara)',
  'AP4TBAC237B-1': 'Apacer AC237 4TB xarici HDD (qara)',
  'AP4TBAC732B-1': 'Apacer AC732 4TB xarici HDD (qara)',
  'AP5TBAC237B-1': 'Apacer AC237 5TB xarici HDD (qara)',
  'AP5TBAC533B-1': 'Apacer AC533 5TB xarici HDD (qara)',
  'AP5TBAC732B-1': 'Apacer AC732 5TB xarici HDD (qara)',
  'AP2TBAC532B-1': 'Apacer AC532 2TB xarici HDD (qara)',
  'AP2TBAC630T-1': 'Apacer AC630 2TB xarici HDD (narıncı)',
  'AP2TBAC631U-1': 'Apacer AC631 2TB xarici HDD (mavi)',
  'AP2TBAC731B-1': 'Apacer AC731 2TB xarici HDD (qara)',
  'AP2TBAC732B-1': 'Apacer AC732 2TB xarici HDD (qara)',
  'AP2TBAC532W-1': 'Apacer AC532 2TB xarici HDD (ağ)',
  'AP4TBAC236B-1': 'Apacer AC236 4TB xarici HDD (qara)',
  'AP128GAH25BB-1': 'Apacer AH25B 128GB USB flash (qara)',
  'AP32GAH750S-1': 'Apacer AH750 32GB USB flash OTG (gümüşü)',
  'AP32GAH357U-1': 'Apacer AH357 32GB USB flash (mavi)',
  'AP64GAH353C-1': 'Apacer AH353 64GB USB flash (qızılı)',
  'AP128GAH353C-1': 'Apacer AH353 128GB USB flash (qızılı)',
  'AP32GAH155U-1': 'Apacer AH155 32GB USB flash (mavi)',
  'AP128GAH350B-1': 'Apacer AH350 128GB USB flash (qara)',
  'AP64GAH25BR-1': 'Apacer AH25B 64GB USB flash (qırmızı)',
  'AP64GAH357U-1': 'Apacer AH357 64GB USB flash (mavi)',
  'AP128GAH25BR-1': 'Apacer AH25B 128GB USB flash (qırmızı)',
  'AP32GAH180R-1': 'Apacer AH180 32GB USB-C/A OTG flash',
  'AP64GAH180R-1': 'Apacer AH180 64GB USB-C/A OTG flash',
  'AP128GAH180R-1': 'Apacer AH180 128GB USB-C/A OTG flash',
};

export function normalizeApacerSku(model: string): string {
  return model
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/\//g, '-')
    .replace(/[^A-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Part number + title → unique catalog identity (handles PS5 vs Standard). */
export function resolveApacerIdentitySku(
  partNumber: string,
  title: string,
): string {
  const base = normalizeApacerSku(partNumber);
  if (base === 'AP1TBAS2280Q4U5-1' && /\bPS5\b/i.test(title)) {
    // Must not end with a bare -PS5 suffix: SKU builder would collapse it
    // onto the Standard part-number SKU.
    return 'AS2280Q4U-1TB-PS5';
  }
  return base;
}

export function listApacerCatalogNameSkus(): string[] {
  return Object.keys(APACER_CATALOG_NAMES);
}

export function apacerDisplayModel(
  sku: string,
  fallbackTitle: string,
): string {
  return resolveApacerCatalogName(sku, fallbackTitle)
    .replace(/^Apacer\s+/i, '')
    .trim();
}

export function resolveApacerCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const catalogName = APACER_CATALOG_NAMES[normalizeApacerSku(sku)];
  if (catalogName !== undefined) {
    return catalogName;
  }
  const trimmed = fallbackTitle.trim();
  if (/^apacer\b/i.test(trimmed)) {
    return trimmed;
  }
  return `Apacer ${trimmed}`.trim();
}
