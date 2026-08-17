/**
 * addlink catalog names: brand + series + capacity + short type/color.
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 */

export type AddlinkNameSpec = {
  label: string;
  value: string;
};

const ADDLINK_CATALOG_NAMES: Record<string, string> = {
  AD8GB32C22P4U: 'addlink P4 8GB DDR4 3200 UDIMM',
  AD16GB32C22P4U: 'addlink P4 16GB DDR4 3200 UDIMM',
  AG8GB32C16S4UB: 'addlink Spider S4 8GB DDR4 3200 (qara)',
  AG16GB32C16S4UB: 'addlink Spider S4 16GB DDR4 3200 (qara)',
  AG8GB32C22N4S: 'addlink Spider N4 8GB DDR4 3200 SODIMM',
  AG16GB32C22N4S: 'addlink Spider N4 16GB DDR4 3200 SODIMM',
  AD16GB56C46P5U: 'addlink P5 16GB DDR5 5600 UDIMM',
  AD32GB56C46P5U: 'addlink P5 32GB DDR5 5600 UDIMM',
  AG16GB56C46S5UB: 'addlink Spider S5 16GB DDR5 5600 (qara)',
  AG16GB56C46S5US: 'addlink Spider S5 16GB DDR5 5600 (gümüşü)',
  AG16GB56C46N5S: 'addlink Spider N5 16GB DDR5 5600 SODIMM',
  AG32GB56C46N5S: 'addlink Spider N5 32GB DDR5 5600 SODIMM',
  AD256GBS20S3S: 'addlink S20 256GB 2.5" SATA SSD',
  AD512GBS20S3S: 'addlink S20 512GB 2.5" SATA SSD',
  AD1TBS20S3S: 'addlink S20 1TB 2.5" SATA SSD',
  AP1920GBB100PM2P: 'addlink B100P 1920GB M.2 NVMe NAS SSD',
  AD512GBS90LTM2P: 'addlink S90 Lite 512GB M.2 NVMe SSD',
  AD1TBG55M2P: 'addlink G55 1TB M.2 NVMe Gen5 SSD',
  AD2TBG55M2P: 'addlink G55 2TB M.2 NVMe Gen5 SSD',
  AD1TBG55HM2P: 'addlink G55H 1TB M.2 NVMe Gen5 (heatsink)',
  AD2TBG55HM2P: 'addlink G55H 2TB M.2 NVMe Gen5 (heatsink)',
  AD1TBS95M2P: 'addlink S95 1TB M.2 NVMe SSD',
  AD2TBS95M2P: 'addlink S95 2TB M.2 NVMe SSD',
  AD4TBS95M2P: 'addlink S95 4TB M.2 NVMe SSD',
  AD500GBP50DK: 'addlink P50 500GB xarici SSD',
  AD1TBP50DK: 'addlink P50 1TB xarici SSD',
  AD2TBP50DK: 'addlink P50 2TB xarici SSD',
  AD256GBMSXU32A: 'addlink Premium 256GB microSDXC',
  AD512GBMSXU32A: 'addlink Gaming 512GB microSDXC',
  AD1TBMSXT3A: 'addlink Gaming 1TB microSDXC',
};

export function normalizeAddlinkSku(model: string): string {
  return model
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/\//g, '-')
    .replace(/[^A-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function listAddlinkCatalogNameSkus(): string[] {
  return Object.keys(ADDLINK_CATALOG_NAMES);
}

export function addlinkDisplayModel(
  sku: string,
  fallbackTitle: string,
): string {
  return resolveAddlinkCatalogName(sku, fallbackTitle)
    .replace(/^addlink\s+/i, '')
    .trim();
}

export function resolveAddlinkCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const catalogName = ADDLINK_CATALOG_NAMES[normalizeAddlinkSku(sku)];
  if (catalogName !== undefined) {
    return catalogName;
  }
  const trimmed = fallbackTitle.trim();
  if (/^addlink\b/i.test(trimmed)) {
    return trimmed;
  }
  return `addlink ${trimmed}`.trim();
}
