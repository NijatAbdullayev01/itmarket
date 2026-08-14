import {
  grandstreamDisplayModel,
  inferGrandstreamSubcategorySlug,
  normalizeGrandstreamSku,
  resolveGrandstreamCatalogName,
} from './grandstream-product-name';

describe('grandstream-product-name', () => {
  it('normalizes Excel model codes into unique SKUs', () => {
    expect(normalizeGrandstreamSku('GWN7605(WORLD)')).toBe('GWN7605');
    expect(normalizeGrandstreamSku('WP820(WORLD)')).toBe('WP820');
    expect(normalizeGrandstreamSku('GWN7802P Pro')).toBe('GWN7802P-PRO');
    expect(normalizeGrandstreamSku('POE INJECTOR(EU PSU)')).toBe(
      'POE-INJECTOR',
    );
    expect(normalizeGrandstreamSku('EU,5V,0.6A')).toBe('EU-5V-0.6A');
    expect(normalizeGrandstreamSku('12V/5A RPS-60W-B PSU')).toBe(
      '12V-5A-RPS-60W-B-PSU',
    );
    expect(normalizeGrandstreamSku('GRP2602w')).toBe('GRP2602W');

    const models = [
      'GWN7605(WORLD)',
      'GWN7660(WORLD)',
      'GWN7660E',
      'GWN7660EM',
      'GWN7802P',
      'GWN7802P Pro',
      'WP820(WORLD)',
      'POE INJECTOR(EU PSU)',
      'EU,5V,0.6A',
      '12V/5A RPS-60W-B PSU',
    ];
    const skus = models.map(normalizeGrandstreamSku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it('keeps model and type without datasheet clauses', () => {
    expect(
      resolveGrandstreamCatalogName(
        'GRP2612P',
        'Carrier-Grade IP Phones, 4 line keys, PoE(No PSU included)',
        { subcategorySlug: 'ip-telefon' },
      ),
    ).toBe('Grandstream GRP2612P IP telefon');
    expect(
      resolveGrandstreamCatalogName(
        'GCC6010',
        'All-in-one convergence device',
        {
          subcategorySlug: 'router',
        },
      ),
    ).toBe('Grandstream GCC6010 konvergens router');
    expect(
      resolveGrandstreamCatalogName(
        'GWN7660LR',
        'Outdoor AX3000 Wi-Fi 6 Access Point',
        { subcategorySlug: 'access-point' },
      ),
    ).toBe('Grandstream GWN7660LR outdoor Wi-Fi 6 Access Point');
    expect(
      resolveGrandstreamCatalogName('GWN7802P', 'Managed Network Switch', {
        subcategorySlug: 'kommutator',
        specs: [{ label: 'Portlar', value: '16 × Gigabit Ethernet PoE/PoE+' }],
      }),
    ).toBe('Grandstream GWN7802P 16-port PoE kommutator');
    expect(
      resolveGrandstreamCatalogName('DP755', 'DECT VoIP Base Station', {
        subcategorySlug: 'ip-dect-telefon',
      }),
    ).toBe('Grandstream DP755 IP DECT baza stansiyası');
    expect(
      resolveGrandstreamCatalogName('GHP611', 'Black Compact Hotel IP Phones', {
        subcategorySlug: 'ip-telefon',
        specs: [{ label: 'Rəng', value: 'Qara (Black)' }],
      }),
    ).toBe('Grandstream GHP611 qara hotel IP telefon');
    expect(grandstreamDisplayModel('GWN7806PL Pro')).toBe('GWN7806PL Pro');
    expect(
      resolveGrandstreamCatalogName('F-SM1310-10KM-10G', 'SFP+ Module'),
    ).toBe('Grandstream F-SM1310-10KM-10G SFP+ modul');
  });

  it('infers subcategory from SKU when Excel slug is omitted', () => {
    expect(inferGrandstreamSubcategorySlug('GWN7670')).toBe('access-point');
    expect(inferGrandstreamSubcategorySlug('UCM6302')).toBe('ip-pbx');
    expect(inferGrandstreamSubcategorySlug('GUV3000')).toBe(
      'ip-telefon-aksesuarlari',
    );
    expect(inferGrandstreamSubcategorySlug('F-SM1310-10KM-10G')).toBe(
      'sfp-modullar',
    );
    expect(inferGrandstreamSubcategorySlug('POE INJECTOR(EU PSU)')).toBe(
      'sebeke-aksesuarlari',
    );
  });
});
