import {
  isQnapCompactCodeName,
  listQnapCatalogNameSkus,
  normalizeQnapSku,
  resolveQnapCatalogName,
} from './qnap-product-name';

const EXCEL_RAW_SKUS = [
  'RAIL-A02-90',
  'QSW-1105-5T',
  'QSW-1108-8T',
  'TR-002',
  'TR-004',
  'TS-133',
  'TS-216G',
  'TS-233',
  'TS-264-8G',
  'TS-364-8G',
  'TS-433-4G',
  'TS-453E-8G',
  'TS-464-8G',
  'TS-473A-8G',
  'TS-AI642-8G',
  'TS-632X-4G',
  'TS-664-8G',
  'TS-673A-8G',
  'TS-832PX-4G',
  'TS-873A-8G',
  'TS-432PXU-2G',
  'TS-432PXU-RP-2G',
  'TS-464eU-8G',
  'TS-464U-RP-8G',
  'TS-832PXU-4G',
  'TS-832PXU-RP-4G',
  'TS-864eU-RP-8G',
  'TS-873AeU-4G',
  'TS-873AeU-RP-4G',
  'TS-855eU-RP-8G',
  'TS-1232PXU-RP-4G',
  'TS-1264U-RP-8G',
  'TS-1273AU-RP-8G',
  'TS-1273AU-RP-8GB',
  'TS-h1277AXU-RP-R5-16G',
  'TS-h1277AXU-RP-R7-32G',
  'TS-h1677AXU-RP-R7-32G',
  'TS-h1887XU-RP-E2334-16G',
  'TRX-10GITSFPP-SR',
  'TRX-25GSFP28-SR',
  'QXG-10G1T',
  'QXG-25G2SF-E810',
  'QXG-2G2T-1225',
  'QM2-2P-244A',
  'QM2-2P-344A',
  'QM2-2P-384A',
  'QXG-10G2SF-X710',
  'QNA-UC10G1T',
  'QSW-M2106-4C',
  'RAIL-B02',
];

describe('qnap-product-name', () => {
  it('detects leftover compact manufacturer codes', () => {
    expect(isQnapCompactCodeName('KOIBOX-100W')).toBe(true);
    expect(isQnapCompactCodeName('TS-435XEU-4G')).toBe(true);
    expect(isQnapCompactCodeName('QNAP TS-233 2-bay NAS')).toBe(false);
  });

  it('normalizes Excel model codes into unique SKUs', () => {
    expect(normalizeQnapSku('TS-435XeU-4G')).toBe('TS-435XEU-4G');
    expect(normalizeQnapSku('TS-873AeU-4G')).toBe('TS-873AEU-4G');
    expect(normalizeQnapSku('TS-h1277AXU-RP-R5-16G')).toBe(
      'TS-H1277AXU-RP-R5-16G',
    );
    expect(normalizeQnapSku('QXG-2G2T-1225')).toBe('QXG-2G2T-I225');
    expect(normalizeQnapSku('  TS-464eU-8G ')).toBe('TS-464EU-8G');
    expect(normalizeQnapSku('TS-832PXU-4G-EU')).toBe('TS-832PXU-4G');

    const skus = EXCEL_RAW_SKUS.map(normalizeQnapSku);
    expect(new Set(skus).size).toBe(skus.length);
    for (const sku of skus) {
      expect(listQnapCatalogNameSkus()).toContain(sku);
    }
  });

  it('covers every QNAP Excel SKU with a catalog title', () => {
    expect(listQnapCatalogNameSkus()).toEqual([
      'RAIL-A02-90',
      'QSW-1105-5T',
      'QSW-1108-8T',
      'TR-002',
      'TR-004',
      'TS-133',
      'TS-216G',
      'TS-233',
      'TS-264-8G',
      'TS-364-8G',
      'TS-433-4G',
      'TS-453E-8G',
      'TS-464-8G',
      'TS-473A-8G',
      'TS-AI642-8G',
      'TS-632X-4G',
      'TS-664-8G',
      'TS-673A-8G',
      'TS-832PX-4G',
      'TS-873A-8G',
      'TS-432PXU-2G',
      'TS-432PXU-RP-2G',
      'TS-464EU-8G',
      'TS-464U-RP-8G',
      'TS-832PXU-4G',
      'TS-832PXU-RP-4G',
      'TS-864EU-RP-8G',
      'TS-873AEU-4G',
      'TS-873AEU-RP-4G',
      'TS-855EU-RP-8G',
      'TS-1232PXU-RP-4G',
      'TS-1264U-RP-8G',
      'TS-1273AU-RP-8G',
      'TS-1273AU-RP-8GB',
      'TS-H1277AXU-RP-R5-16G',
      'TS-H1277AXU-RP-R7-32G',
      'TS-H1677AXU-RP-R7-32G',
      'TS-H1887XU-RP-E2334-16G',
      'TRX-10GITSFPP-SR',
      'TRX-25GSFP28-SR',
      'QXG-10G1T',
      'QXG-25G2SF-E810',
      'QXG-2G2T-I225',
      'QM2-2P-244A',
      'QM2-2P-344A',
      'QM2-2P-384A',
      'QXG-10G2SF-X710',
      'QNA-UC10G1T',
      'QSW-M2106-4C',
      'QSW-M1204-4C',
      'QSW-M408-4C',
      'KOIBOX-100W',
      'TS-435XEU-4G',
      'RAIL-B02',
      '7212324T-7050000-000-RS',
      '72123400-6000000-000-RS',
      'ST8000VN004',
    ]);
    expect(listQnapCatalogNameSkus()).toHaveLength(57);
  });

  it('keeps model and short type without datasheet clauses', () => {
    expect(
      resolveQnapCatalogName(
        'TS-233',
        '2-bay NAS, supporting 1GbE connectivity',
      ),
    ).toBe('QNAP TS-233 2-bay NAS');
    expect(
      resolveQnapCatalogName(
        'QSW-M2106-4C',
        'QNAP QSW-M2106-4C 10GbE Managed Switch',
      ),
    ).toBe('QNAP QSW-M2106-4C 10-port kommutator');
    expect(resolveQnapCatalogName('KOIBOX-100W', 'KOIBOX-100W')).toBe(
      'QNAP KoiBox-100W konfrans kamerası',
    );
    expect(resolveQnapCatalogName('QSW-M1204-4C', 'QSW-M1204-4C')).toBe(
      'QNAP QSW-M1204-4C 10GbE kommutator',
    );
    expect(resolveQnapCatalogName('TS-832PXU-4G-EU', 'TS-832PXU-4G-EU')).toBe(
      'QNAP TS-832PXU-4G 8-bay rack NAS',
    );
    expect(resolveQnapCatalogName('QXG-2G2T-1225', '2.5GbE NIC')).toBe(
      'QNAP QXG-2G2T-I225 2.5GbE adapter',
    );
    expect(resolveQnapCatalogName('RAIL-B02', 'Rail kit')).toBe(
      'QNAP RAIL-B02 rack rels',
    );
    expect(
      resolveQnapCatalogName(
        '7212324T-7050000-000-RS',
        'QNAP IronWolf 24TB NAS HDD',
      ),
    ).toBe('QNAP IronWolf 24TB NAS');
    expect(
      resolveQnapCatalogName(
        '72123400-6000000-000-RS',
        'QNAP IronWolf 4TB NAS HDD',
      ),
    ).toBe('QNAP IronWolf 4TB NAS');
    expect(
      resolveQnapCatalogName('ST8000VN004', 'QNAP IronWolf 8TB NAS HDD'),
    ).toBe('QNAP IronWolf 8TB NAS');
    expect(
      resolveQnapCatalogName(
        '72123800-6051100-000-RS',
        'QNAP IronWolf 8TB NAS HDD',
      ),
    ).toBe('QNAP IronWolf 8TB NAS');
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
