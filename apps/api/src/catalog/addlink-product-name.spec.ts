import {
  listAddlinkCatalogNameSkus,
  normalizeAddlinkSku,
  resolveAddlinkCatalogName,
} from './addlink-product-name';

export const ADDLINK_EXCEL_RAW_SKUS = [
  'Ad8GB32C22P4U',
  'Ad16GB32C22P4U',
  'AG8GB32C16S4UB',
  'AG16GB32C16S4UB',
  'AG8GB32C22N4S',
  'AG16GB32C22N4S',
  'Ad16GB56C46P5U',
  'Ad32GB56C46P5U',
  'AG16GB56C46S5UB',
  'AG16GB56C46S5US',
  'AG16GB56C46N5S',
  'AG32GB56C46N5S',
  'ad256GBS20S3S',
  'ad512GBS20S3S',
  'ad1TBS20S3S',
  'AP1920GBB100PM2P',
  'ad512GBS90LTM2P',
  'ad1TBG55M2P',
  'ad2TBG55M2P',
  'ad1TBG55HM2P',
  'ad2TBG55HM2P',
  'ad1TBS95M2P',
  'ad2TBS95M2P',
  'ad4TBS95M2P',
  'ad500GBP50DK',
  'ad1TBP50DK',
  'ad2TBP50DK',
  'ad256GBMSXU32A',
  'ad512GBMSXU32A',
  'ad1TBMSXT3A',
] as const;

describe('addlink-product-name', () => {
  it('normalizes Excel part numbers into unique SKUs', () => {
    expect(normalizeAddlinkSku(' Ad8GB32C22P4U ')).toBe('AD8GB32C22P4U');
    expect(normalizeAddlinkSku('ad256GBS20S3S')).toBe('AD256GBS20S3S');
    expect(normalizeAddlinkSku('ad1TBMSXT3A')).toBe('AD1TBMSXT3A');
    expect(normalizeAddlinkSku('AP1920GBB100PM2P')).toBe('AP1920GBB100PM2P');

    const skus = ADDLINK_EXCEL_RAW_SKUS.map(normalizeAddlinkSku);
    expect(new Set(skus).size).toBe(skus.length);
    expect(skus).toEqual(expect.arrayContaining(listAddlinkCatalogNameSkus()));
  });

  it('covers every addlink.xlsx SKU with a catalog title', () => {
    expect(listAddlinkCatalogNameSkus()).toEqual(
      ADDLINK_EXCEL_RAW_SKUS.map(normalizeAddlinkSku),
    );
    expect(listAddlinkCatalogNameSkus()).toHaveLength(30);
  });

  it('keeps series, capacity and short type without datasheet clauses', () => {
    expect(
      resolveAddlinkCatalogName(
        'Ad8GB32C22P4U',
        'addlink P4 8GB DDR4 3200 UDIMM',
      ),
    ).toBe('addlink P4 8GB DDR4 3200 UDIMM');
    expect(
      resolveAddlinkCatalogName(
        'AG16GB56C46S5US',
        'addlink Spider S5 16GB DDR5 5600 UDIMM Silver',
      ),
    ).toBe('addlink Spider S5 16GB DDR5 5600 (gümüşü)');
    expect(
      resolveAddlinkCatalogName(
        'ad256GBS20S3S',
        '256GB 2.5” SATA III 6Gb/s SSD',
      ),
    ).toBe('addlink S20 256GB 2.5" SATA SSD');
    expect(
      resolveAddlinkCatalogName(
        'AP1920GBB100PM2P',
        'addlink B100P 1920GB M.2 NVMe NAS SSD',
      ),
    ).toBe('addlink B100P 1920GB M.2 NVMe NAS SSD');
    expect(
      resolveAddlinkCatalogName(
        'ad500GBP50DK',
        '500GB USB3.2 Gen2 portable SSD',
      ),
    ).toBe('addlink P50 500GB xarici SSD');
    expect(
      resolveAddlinkCatalogName(
        'ad1TBG55HM2P',
        'addlink G55H 1TB M.2 NVMe Gen5 SSD Heatsink',
      ),
    ).toBe('addlink G55H 1TB M.2 NVMe Gen5 (heatsink)');
  });

  it('prefixes addlink on unknown titles', () => {
    expect(resolveAddlinkCatalogName('UNKNOWN-1', 'Demo RAM')).toBe(
      'addlink Demo RAM',
    );
    expect(resolveAddlinkCatalogName('UNKNOWN-1', 'addlink Demo RAM')).toBe(
      'addlink Demo RAM',
    );
  });
});
