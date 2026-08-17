import {
  listQnaphddsCatalogNameSkus,
  normalizeQnaphddsSku,
  resolveQnaphddsBrand,
  resolveQnaphddsCatalogName,
} from './qnaphdds-product-name';

const EXCEL_RAW_SKUS = [
  'ST1000VX013',
  'ST4000VN006',
  'ST4000NM024B',
  'ST6000VX009',
  'ST8000VX010',
  'ST8000NM017B',
  'ST8000VN004',
  'ST10000NM017B',
  'ST10000VE001',
  'ST12000NM000J',
  'ST16000NM002H',
  'ST16000NT001',
  'WUH722016CLE6',
  'MG09ACA18TE',
  'ST20000NT001',
  'MG10ACA20TE',
  'ST20000NM007D',
  'ST20000NM002H',
  'ST24000NM002H',
  'ST28000NM003K',
  'ST30000NM004K',
  'ST32000NM004K',
];

describe('qnaphdds-product-name', () => {
  it('normalizes Excel part numbers into unique SKUs', () => {
    expect(normalizeQnaphddsSku(' st1000vx013 ')).toBe('ST1000VX013');
    expect(normalizeQnaphddsSku('WUH722016CLE6')).toBe('WUH722016CLE6');
    expect(normalizeQnaphddsSku('mg09aca18te')).toBe('MG09ACA18TE');

    const skus = EXCEL_RAW_SKUS.map(normalizeQnaphddsSku);
    expect(new Set(skus).size).toBe(skus.length);
    expect(skus).toEqual(expect.arrayContaining(listQnaphddsCatalogNameSkus()));
  });

  it('covers every qnaphdds.xlsx SKU with a catalog title', () => {
    expect(listQnaphddsCatalogNameSkus()).toEqual(EXCEL_RAW_SKUS);
    expect(listQnaphddsCatalogNameSkus()).toHaveLength(22);
  });

  it('maps part-number prefixes to Seagate, WD and Toshiba', () => {
    expect(resolveQnaphddsBrand('ST4000VN006')).toEqual({
      name: 'Seagate',
      slug: 'seagate',
    });
    expect(resolveQnaphddsBrand('WUH722016CLE6')).toEqual({
      name: 'WD',
      slug: 'wd',
    });
    expect(resolveQnaphddsBrand('MG10ACA20TE')).toEqual({
      name: 'Toshiba',
      slug: 'toshiba',
    });
  });

  it('keeps series, part number and short type without datasheet clauses', () => {
    expect(
      resolveQnaphddsCatalogName(
        'ST1000VX013',
        "SEAGATE HDD SkyHawk Surveillance (3.5'' | 1TB | SATA 6Gb/s | 5400 rpm)",
      ),
    ).toBe('Seagate SkyHawk ST1000VX013 1TB nəzarət HDD');
    expect(
      resolveQnaphddsCatalogName(
        'ST4000VN006',
        'HDD, 4TB, Seagate IronWolf, SATA III, 3.5", 5400rpm, 256MB, CMR',
      ),
    ).toBe('Seagate IronWolf ST4000VN006 4TB NAS HDD');
    expect(
      resolveQnaphddsCatalogName(
        'WUH722016CLE6',
        'HDD, 16TB, WD Ultrastar DC HC555, SATAIII, 3.5"',
      ),
    ).toBe('WD Ultrastar DC HC555 WUH722016CLE6 16TB server HDD');
    expect(resolveQnaphddsCatalogName('MG09ACA18TE', 'Toshiba MG09 18TB')).toBe(
      'Toshiba MG09ACA18TE 18TB server HDD',
    );
  });

  it('prefixes the resolved brand on unknown titles', () => {
    expect(resolveQnaphddsCatalogName('ST9999XX001', 'Demo HDD')).toBe(
      'Seagate Demo HDD',
    );
    expect(resolveQnaphddsCatalogName('ST9999XX001', 'Seagate Demo HDD')).toBe(
      'Seagate Demo HDD',
    );
  });
});
