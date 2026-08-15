import {
  listTranscendCatalogNameSkus,
  normalizeTranscendSku,
  resolveTranscendCatalogName,
} from './transcend-product-name';

describe('transcend-product-name', () => {
  it('normalizes Excel model codes into unique SKUs', () => {
    expect(normalizeTranscendSku('TS1TESD410C')).toBe('TS1TESD410C');
    expect(normalizeTranscendSku(' ts500gesd380c ')).toBe('TS500GESD380C');
    expect(normalizeTranscendSku('TS1TSJ25M3S')).toBe('TS1TSJ25M3S');

    const models = [
      'TS1TESD410C',
      'TS2TESD410C',
      'TS500GESD380C',
      'TS1TESD380C',
      'TS2TESD380C',
      'TS500GESD265C',
      'TS1TESD265C',
      'TS512GESD310C',
      'TS250GESD270C',
      'TS500GESD270C',
      'TS1TSJ25M3S',
      'TS1TSJ25M3G',
      'TS2TSJ25M3S',
      'TS2TSJ25M3G',
      'TS1TSJ25H3B',
    ];
    const skus = models.map(normalizeTranscendSku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it('covers every Transcend Excel SKU with a catalog title', () => {
    expect(listTranscendCatalogNameSkus()).toEqual([
      'TS1TESD410C',
      'TS2TESD410C',
      'TS500GESD380C',
      'TS1TESD380C',
      'TS2TESD380C',
      'TS500GESD265C',
      'TS1TESD265C',
      'TS512GESD310C',
      'TS250GESD270C',
      'TS500GESD270C',
      'TS1TSJ25M3S',
      'TS1TSJ25M3G',
      'TS2TSJ25M3S',
      'TS2TSJ25M3G',
      'TS1TSJ25H3B',
    ]);
  });

  it('keeps series, capacity and short type without datasheet clauses', () => {
    expect(
      resolveTranscendCatalogName(
        'TS1TESD410C',
        '1TB, External SSD, ESD410C, USB 20Gbps, Type C',
      ),
    ).toBe('Transcend ESD410C 1TB xarici SSD');
    expect(
      resolveTranscendCatalogName(
        'TS512GESD310C',
        '512GB, External SSD, ESD310C, USB 10Gbps, Type C/A',
      ),
    ).toBe('Transcend ESD310C 512GB xarici SSD');
    expect(
      resolveTranscendCatalogName(
        'TS1TSJ25M3S',
        '1TB StoreJet2.5" M3, Portable HDD',
      ),
    ).toBe('Transcend StoreJet 25M3S 1TB xarici HDD');
    expect(
      resolveTranscendCatalogName(
        'TS1TSJ25H3B',
        '1TB StoreJet2.5" H3B, portable HDD',
      ),
    ).toBe('Transcend StoreJet 25H3B 1TB xarici HDD');
  });

  it('prefixes Transcend on unknown titles', () => {
    expect(resolveTranscendCatalogName('UNKNOWN-SKU', 'Demo SSD')).toBe(
      'Transcend Demo SSD',
    );
    expect(
      resolveTranscendCatalogName('UNKNOWN-SKU', 'Transcend Demo SSD'),
    ).toBe('Transcend Demo SSD');
  });
});
