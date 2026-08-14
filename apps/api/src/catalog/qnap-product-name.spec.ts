import {
  listQnapCatalogNameSkus,
  normalizeQnapSku,
  resolveQnapCatalogName,
} from './qnap-product-name';

describe('qnap-product-name', () => {
  it('normalizes Excel model codes into unique SKUs', () => {
    expect(normalizeQnapSku('TS-435XeU-4G')).toBe('TS-435XEU-4G');
    expect(normalizeQnapSku('KoiBox-100W')).toBe('KOIBOX-100W');
    expect(normalizeQnapSku(' 7212324T-7050000-000-RS ')).toBe(
      '7212324T-7050000-000-RS',
    );

    const models = [
      'TS-435XeU-4G',
      'TS-873AeU-4G',
      'TS-832PXU-4G-EU',
      'TS-233',
      'QXG-10G2SF-X710',
      'KoiBox-100W',
      'QSW-M1204-4C',
      'QSW-M408-4C',
      'RAIL-B02',
      '7212324T-7050000-000-RS',
      '72123400-6000000-000-RS',
      '72123800-6051100-000-RS',
    ];
    const skus = models.map(normalizeQnapSku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it('covers every QNAP Excel SKU with a catalog title', () => {
    expect(listQnapCatalogNameSkus()).toEqual([
      'TS-435XEU-4G',
      'TS-873AEU-4G',
      'TS-832PXU-4G-EU',
      'TS-233',
      'QXG-10G2SF-X710',
      'KOIBOX-100W',
      'QSW-M1204-4C',
      'QSW-M408-4C',
      'RAIL-B02',
      '7212324T-7050000-000-RS',
      '72123400-6000000-000-RS',
      '72123800-6051100-000-RS',
    ]);
  });

  it('keeps model and short type without datasheet clauses', () => {
    expect(
      resolveQnapCatalogName(
        'TS-435XeU-4G',
        '4-bay NAS, supporting 2.5GbE/10GbE connectivity and M.2 NVMe SSD caching',
      ),
    ).toBe('QNAP TS-435XeU-4G 4-bay rack NAS');
    expect(
      resolveQnapCatalogName(
        'QSW-M1204-4C',
        'QNAP QSW-M1204-4C 10GbE Managed Switch',
      ),
    ).toBe('QNAP QSW-M1204-4C 12-port 10GbE kommutator');
    expect(
      resolveQnapCatalogName(
        '7212324T-7050000-000-RS',
        'Seagate, HDD.IronWolf. SATAIII. 3.5-inch, 24TB 5Y',
      ),
    ).toBe('QNAP IronWolf 24TB NAS HDD');
  });

  it('prefixes QNAP on unknown titles', () => {
    expect(resolveQnapCatalogName('UNKNOWN-SKU', 'Demo NAS')).toBe(
      'QNAP Demo NAS',
    );
    expect(resolveQnapCatalogName('UNKNOWN-SKU', 'QNAP Demo NAS')).toBe(
      'QNAP Demo NAS',
    );
  });
});
