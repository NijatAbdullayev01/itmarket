/**
 * Kingston catalog names: brand + series + capacity + short type.
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 */

export type KingstonNameSpec = {
  label: string;
  value: string;
};

const KINGSTON_CATALOG_NAMES: Record<string, string> = {
  'KVR32N22S8-8WP': 'Kingston ValueRAM 8GB DDR4 3200 UDIMM',
  'KVR32N22D8-16WP': 'Kingston ValueRAM 16GB DDR4 3200 UDIMM',
  'KVR32N22D8-32': 'Kingston ValueRAM 32GB DDR4 3200 UDIMM',
  'KVR32S22S8-8WP': 'Kingston ValueRAM 8GB DDR4 3200 SODIMM',
  'KVR32S22D8-16WP': 'Kingston ValueRAM 16GB DDR4 3200 SODIMM',
  'KVR32S22D8-32': 'Kingston ValueRAM 32GB DDR4 3200 SODIMM',
  'KVR56U46BS6-8': 'Kingston ValueRAM 8GB DDR5 5600 UDIMM',
  'KVR56U46BS8-16': 'Kingston ValueRAM 16GB DDR5 5600 UDIMM',
  'KVR56U46BS8-32': 'Kingston ValueRAM 32GB DDR5 5600 UDIMM',
  'KF588CU42RS-24': 'Kingston FURY Renegade 24GB DDR5 8800 CUDIMM Silver',
  'KF588CU42RWA-24': 'Kingston FURY Renegade RGB 24GB DDR5 8800 CUDIMM White',
  'KF588CU42RSA-24': 'Kingston FURY Renegade RGB 24GB DDR5 8800 CUDIMM Silver',
  'KF588CU42RW-24': 'Kingston FURY Renegade 24GB DDR5 8800 CUDIMM White',
  'KF548C38BBAK2-32': 'Kingston FURY Beast RGB 32GB (2x16GB) DDR5 4800',
  'KF580C38RWAK2-32': 'Kingston FURY Renegade RGB 32GB (2x16GB) DDR5 8000 White',
  'KF588CU42RWAK2-48':
    'Kingston FURY Renegade RGB 48GB (2x24GB) DDR5 8800 CUDIMM White',
  'KF588CU42RSAK2-48':
    'Kingston FURY Renegade RGB 48GB (2x24GB) DDR5 8800 CUDIMM Silver',
  'KF588CU42RWK2-48':
    'Kingston FURY Renegade 48GB (2x24GB) DDR5 8800 CUDIMM White',
  'KF588CU42RSK2-48':
    'Kingston FURY Renegade 48GB (2x24GB) DDR5 8800 CUDIMM Silver',
  'KVR56S46BS6-8': 'Kingston ValueRAM 8GB DDR5 5600 SODIMM',
  'KVR56S46BS8-16': 'Kingston ValueRAM 16GB DDR5 5600 SODIMM',
  'KVR56S46BD8-32': 'Kingston ValueRAM 32GB DDR5 5600 SODIMM',
  'SA400S37-240G': 'Kingston A400 240GB 2.5" SATA SSD',
  'SA400S37-480G': 'Kingston A400 480GB 2.5" SATA SSD',
  'SA400S37-960G': 'Kingston A400 960GB 2.5" SATA SSD',
  'SKC600-256G': 'Kingston KC600 256GB 2.5" SATA SSD',
  'SKC600-512G': 'Kingston KC600 512GB 2.5" SATA SSD',
  'SKC600-1024G': 'Kingston KC600 1TB 2.5" SATA SSD',
  'SKC600-2048G': 'Kingston KC600 2TB 2.5" SATA SSD',
  'SEDC600M-480G': 'Kingston DC600M 480GB 2.5" SATA NAS SSD',
  'SEDC600M-960G': 'Kingston DC600M 960GB 2.5" SATA NAS SSD',
  'SEDC600M-1920G': 'Kingston DC600M 1920GB 2.5" SATA NAS SSD',
  'SEDC600M-3840G': 'Kingston DC600M 3840GB 2.5" SATA NAS SSD',
  'SEDC600M-7680G': 'Kingston DC600M 7680GB 2.5" SATA NAS SSD',
  'SEDC1000BM8-960G': 'Kingston DC1000B 960GB M.2 NVMe NAS SSD',
  'SEDC2000BM8-960G': 'Kingston DC2000B 960GB M.2 NVMe NAS SSD',
  'SNV3S-500G': 'Kingston NV3 500GB M.2 NVMe SSD',
  'SNV3S-1000G': 'Kingston NV3 1TB M.2 NVMe SSD',
  'SNV3S-2000G': 'Kingston NV3 2TB M.2 NVMe SSD',
  'SKC3000S-512G': 'Kingston KC3000 512GB M.2 NVMe SSD',
  'SKC3000S-1024G': 'Kingston KC3000 1TB M.2 NVMe SSD',
  'SKC3000D-2048G': 'Kingston KC3000 2TB M.2 NVMe SSD',
  'SFYR2S-1T0': 'Kingston FURY Renegade G5 1TB M.2 NVMe SSD',
  'SFYR2S-2T0': 'Kingston FURY Renegade G5 2TB M.2 NVMe SSD',
  'SFYR2S-4T0': 'Kingston FURY Renegade G5 4TB M.2 NVMe SSD',
  'SFYRS-1000G': 'Kingston FURY Renegade 1TB M.2 NVMe SSD',
  'SNV3S-4000G': 'Kingston NV3 4TB M.2 NVMe SSD',
  'DTXS-64GB': 'Kingston DataTraveler Exodia S 64GB USB flash',
  'DTMC3G2-64GB': 'Kingston DataTraveler Micro 64GB USB flash',
  'DTDUO3CG3-64GB': 'Kingston DataTraveler microDuo 3C 64GB USB flash',
  'DTXS-128GB': 'Kingston DataTraveler Exodia S 128GB USB flash',
  'DT80-128GB': 'Kingston DataTraveler 80 128GB USB-C flash',
  'DTDUO3CG3-128GB': 'Kingston DataTraveler microDuo 3C 128GB USB flash',
  'DTDUO3CG3-256GB': 'Kingston DataTraveler microDuo 3C 256GB USB flash',
  'DTXS-256GB': 'Kingston DataTraveler Exodia S 256GB USB flash',
  'DTKN-256GB': 'Kingston DataTraveler Kyson 256GB USB flash',
  'DTX-256GB': 'Kingston DataTraveler Exodia 256GB USB flash',
  'DTXM-256GB': 'Kingston DataTraveler Exodia M 256GB USB flash',
  'DTXS-512GB': 'Kingston DataTraveler Exodia S 512GB USB flash',
  'SDCS2-32GB': 'Kingston Canvas Select Plus 32GB microSDHC',
  'SDCG4-64GB': 'Kingston Canvas Go! Plus Gen4 64GB microSDXC',
  'SDCS2-64GB': 'Kingston Canvas Select Plus 64GB microSDXC',
  'SDCG4-128GB': 'Kingston Canvas Go! Plus Gen4 128GB microSDXC',
  'SDCS2-128GB': 'Kingston Canvas Select Plus 128GB microSDXC',
  'SDCS2-256GB': 'Kingston Canvas Select Plus 256GB microSDXC',
  'SDCG4-256GB': 'Kingston Canvas Go! Plus Gen4 256GB microSDXC',
  'SDCG3-256GB': 'Kingston Canvas Go! Plus Gen3 256GB microSDXC',
  'SDCS2-512GB': 'Kingston Canvas Select Plus 512GB microSDXC',
  'SDCG3-512GB': 'Kingston Canvas Go! Plus Gen3 512GB microSDXC',
  'SDCG4-512GB': 'Kingston Canvas Go! Plus Gen4 512GB microSDXC',
  'SDCG3-1TB': 'Kingston Canvas Go! Plus Gen3 1TB microSDXC',
  'SDCG4-1TB': 'Kingston Canvas Go! Plus Gen4 1TB microSDXC',
  'SXS2000-500G': 'Kingston XS2000 500GB xarici SSD',
  'SPSD-512GB': 'Kingston Dual Portable 512GB xarici SSD',
  'SPSD-1TB': 'Kingston Dual Portable 1TB xarici SSD',
  'SPSD-2TB': 'Kingston Dual Portable 2TB xarici SSD',
  'SXS1000R-1000GA': 'Kingston XS1000 1TB xarici SSD (qırmızı)',
  'SXS1000-1000GA': 'Kingston XS1000 1TB xarici SSD (qara)',
  'SXS1000R-2000GA': 'Kingston XS1000 2TB xarici SSD (qırmızı)',
  'SXS1000-2000GA': 'Kingston XS1000 2TB xarici SSD (qara)',
  'SXS2000-4000GA': 'Kingston XS2000 4TB xarici SSD',
};

export function normalizeKingstonSku(model: string): string {
  return model
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/\//g, '-')
    .replace(/[^A-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function listKingstonCatalogNameSkus(): string[] {
  return Object.keys(KINGSTON_CATALOG_NAMES);
}

export function kingstonDisplayModel(
  sku: string,
  fallbackTitle: string,
): string {
  return resolveKingstonCatalogName(sku, fallbackTitle)
    .replace(/^Kingston\s+/i, '')
    .trim();
}

export function resolveKingstonCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const catalogName = KINGSTON_CATALOG_NAMES[normalizeKingstonSku(sku)];
  if (catalogName !== undefined) {
    return catalogName;
  }
  const trimmed = fallbackTitle.trim();
  if (/^kingston\b/i.test(trimmed)) {
    return trimmed;
  }
  return `Kingston ${trimmed}`.trim();
}
