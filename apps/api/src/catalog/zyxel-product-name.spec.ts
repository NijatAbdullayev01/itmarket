import {
  listZyxelCatalogNameSkus,
  normalizeZyxelSku,
  resolveZyxelCatalogName,
} from './zyxel-product-name';

describe('zyxel-product-name', () => {
  it('normalizes Excel model codes into unique SKUs', () => {
    expect(normalizeZyxelSku('GS1008HP')).toBe('GS1008HP');
    expect(normalizeZyxelSku('GS1100-10HP')).toBe('GS1100-10HP');
    expect(normalizeZyxelSku('GS1900-48HPv2')).toBe('GS1900-48HPV2');
    expect(normalizeZyxelSku('  NWA50AX ')).toBe('NWA50AX');
    expect(normalizeZyxelSku('WAX300H')).toBe('WAX300H');

    const models = [
      'GS1008HP',
      'GS1100-10HP',
      'GS1100-16',
      'GS1100-24E',
      'GS1900-48',
      'GS1900-48HPv2',
      'GS1920-24HPv2',
      'GS1920-48HPv2',
      'XGS1935-28',
      'XGS1935-52',
      'GS2220-10',
      'GS2220-28HP',
      'NWA50AX',
      'NWA55AXE',
      'WAX300H',
    ];
    const skus = models.map(normalizeZyxelSku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it('covers every Zyxel Excel SKU with a catalog title', () => {
    expect(listZyxelCatalogNameSkus()).toEqual([
      'GS1008HP',
      'GS1100-10HP',
      'GS1100-16',
      'GS1100-24E',
      'GS1900-48',
      'GS1900-48HPV2',
      'GS1920-24HPV2',
      'GS1920-48HPV2',
      'XGS1935-28',
      'XGS1935-52',
      'GS2220-10',
      'GS2220-28HP',
      'NWA50AX',
      'NWA55AXE',
      'WAX300H',
    ]);
  });

  it('keeps model and short type without datasheet clauses', () => {
    expect(
      resolveZyxelCatalogName(
        'GS1008HP',
        'Zyxel GS1008HP 8-port Gigabit Unmanaged PoE+ Switch',
      ),
    ).toBe('Zyxel GS1008HP 8-port PoE+ kommutator');
    expect(
      resolveZyxelCatalogName(
        'GS1900-48HPv2',
        'Zyxel GS1900-48HPv2 48-port Gigabit Smart Managed PoE+ Switch',
      ),
    ).toBe('Zyxel GS1900-48HPv2 48-port PoE+ kommutator');
    expect(
      resolveZyxelCatalogName(
        'NWA55AXE',
        'Zyxel NebulaFlex NWA55AXE AX1800 Wi-Fi 6 Outdoor Access Point',
      ),
    ).toBe('Zyxel NWA55AXE outdoor Wi-Fi 6 Access Point');
    expect(
      resolveZyxelCatalogName(
        'WAX300H',
        'Zyxel NebulaFlex Pro WAX300H AX3000 Wi-Fi 6 Wall-Plate Access Point',
      ),
    ).toBe('Zyxel WAX300H wall-plate Wi-Fi 6 Access Point');
  });

  it('prefixes Zyxel on unknown titles', () => {
    expect(resolveZyxelCatalogName('UNKNOWN-SKU', 'Demo Switch')).toBe(
      'Zyxel Demo Switch',
    );
    expect(resolveZyxelCatalogName('UNKNOWN-SKU', 'Zyxel Demo Switch')).toBe(
      'Zyxel Demo Switch',
    );
  });
});
