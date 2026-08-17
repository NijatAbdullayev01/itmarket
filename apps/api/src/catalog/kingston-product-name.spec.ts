import {
  listKingstonCatalogNameSkus,
  normalizeKingstonSku,
  resolveKingstonCatalogName,
} from './kingston-product-name';

export const KINGSTON_EXCEL_RAW_SKUS = [
  'KVR32N22S8/8WP',
  'KVR32N22D8/16WP',
  'KVR32N22D8/32',
  'KVR32S22S8/8WP',
  'KVR32S22D8/16WP',
  'KVR32S22D8/32',
  'KVR56U46BS6-8',
  'KVR56U46BS8-16',
  'KVR56U46BS8-32',
  'KF588CU42RS-24',
  'KF588CU42RWA-24',
  'KF588CU42RSA-24',
  'KF588CU42RW-24',
  'KF548C38BBAK2-32',
  'KF580C38RWAK2-32',
  'KF588CU42RWAK2-48',
  'KF588CU42RSAK2-48',
  'KF588CU42RWK2-48',
  'KF588CU42RSK2-48',
  'KVR56S46BS6-8',
  'KVR56S46BS8-16',
  'KVR56S46BD8-32',
  'SA400S37/240G',
  'SA400S37/480G',
  'SA400S37/960G',
  'SKC600/256G',
  'SKC600/512G',
  'SKC600/1024G',
  'SKC600/2048G',
  'SEDC600M/480G',
  'SEDC600M/960G',
  'SEDC600M/1920G',
  'SEDC600M/3840G',
  'SEDC600M/7680G',
  'SEDC1000BM8/960G',
  'SEDC2000BM8/960G',
  'SNV3S/500G',
  'SNV3S/1000G',
  'SNV3S/2000G',
  'SKC3000S/512G',
  'SKC3000S/1024G',
  'SKC3000D/2048G',
  'SFYR2S/1T0',
  'SFYR2S/2T0',
  'SFYR2S/4T0',
  'SFYRS/1000G',
  'SNV3S/4000G',
  'DTXS/64GB',
  'DTMC3G2/64GB',
  'DTDUO3CG3/64GB',
  'DTXS/128GB',
  'DT80/128GB',
  'DTDUO3CG3/128GB',
  'DTDUO3CG3/256GB',
  'DTXS/256GB',
  'DTKN/256GB',
  'DTX/256GB',
  'DTXM/256GB',
  'DTXS/512GB',
  'SDCS2/32GB',
  'SDCG4/64GB',
  'SDCS2/64GB',
  'SDCG4/128GB',
  'SDCS2/128GB',
  'SDCS2/256GB',
  'SDCG4/256GB',
  'SDCG3/256GB',
  'SDCS2/512GB',
  'SDCG3/512GB',
  'SDCG4/512GB',
  'SDCG3/1TB',
  'SDCG4/1TB',
  'SXS2000/500G',
  'SPSD/512GB',
  'SPSD/1TB',
  'SPSD/2TB',
  'SXS1000R/1000GA',
  'SXS1000/1000GA',
  'SXS1000R/2000GA',
  'SXS1000/2000GA',
  'SXS2000/4000GA',
] as const;

describe('kingston-product-name', () => {
  it('normalizes Excel part numbers into unique SKUs', () => {
    expect(normalizeKingstonSku(' kvr32n22s8/8wp ')).toBe('KVR32N22S8-8WP');
    expect(normalizeKingstonSku('SA400S37/240G')).toBe('SA400S37-240G');
    expect(normalizeKingstonSku('KVR56U46BS6-8')).toBe('KVR56U46BS6-8');
    expect(normalizeKingstonSku('SDCG4/1TB')).toBe('SDCG4-1TB');

    const skus = KINGSTON_EXCEL_RAW_SKUS.map(normalizeKingstonSku);
    expect(new Set(skus).size).toBe(skus.length);
    expect(skus).toEqual(expect.arrayContaining(listKingstonCatalogNameSkus()));
  });

  it('covers every kingston.xlsx SKU with a catalog title', () => {
    expect(listKingstonCatalogNameSkus()).toEqual(
      KINGSTON_EXCEL_RAW_SKUS.map(normalizeKingstonSku),
    );
    expect(listKingstonCatalogNameSkus()).toHaveLength(81);
  });

  it('keeps series, capacity and short type without datasheet clauses', () => {
    expect(
      resolveKingstonCatalogName(
        'KVR32N22S8/8WP',
        'Kingston ValueRAM 8GB DDR4 3200 CL22 1Rx8 UDIMM',
      ),
    ).toBe('Kingston ValueRAM 8GB DDR4 3200 UDIMM');
    expect(
      resolveKingstonCatalogName(
        'KF548C38BBAK2-32',
        'Kingston FURY Beast RGB 32GB (2x16GB) DDR5 4800',
      ),
    ).toBe('Kingston FURY Beast RGB 32GB (2x16GB) DDR5 4800');
    expect(
      resolveKingstonCatalogName('SA400S37/240G', '240GB A400 SATA3 2.5 SSD'),
    ).toBe('Kingston A400 240GB 2.5" SATA SSD');
    expect(
      resolveKingstonCatalogName('DTXS/64GB', 'Kingston DataTraveler Exodia S 64GB'),
    ).toBe('Kingston DataTraveler Exodia S 64GB USB flash');
    expect(
      resolveKingstonCatalogName(
        'SXS2000/500G',
        '500GB Portable SSD | XS2000',
      ),
    ).toBe('Kingston XS2000 500GB xarici SSD');
    expect(
      resolveKingstonCatalogName(
        'SEDC600M/480G',
        'Kingston DC600M 480GB 2.5" SATA NAS SSD',
      ),
    ).toBe('Kingston DC600M 480GB 2.5" SATA NAS SSD');
  });

  it('prefixes Kingston on unknown titles', () => {
    expect(resolveKingstonCatalogName('UNKNOWN-1', 'Demo RAM')).toBe(
      'Kingston Demo RAM',
    );
    expect(resolveKingstonCatalogName('UNKNOWN-1', 'Kingston Demo RAM')).toBe(
      'Kingston Demo RAM',
    );
  });
});
