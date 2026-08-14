import {
  h3cDisplayModel,
  normalizeH3cSku,
  resolveH3cCatalogName,
} from './h3c-product-name';

describe('h3c-product-name', () => {
  it('normalizes Excel model codes into unique SKUs', () => {
    expect(normalizeH3cSku('sfp-ge-sx-mm850-a')).toBe('SFP-GE-SX-MM850-A');
    expect(normalizeH3cSku('LS-5024PV3-EI-GL')).toBe('LS-5024PV3-EI-GL');
    expect(normalizeH3cSku(' 9801A3JX ')).toBe('9801A3JX');

    const models = [
      '9801A3JX',
      '9801A5ND',
      'SFP-GE-SX-MM850-A',
      'SFP-XG-SX-MM850-E',
      'LS-5024PV3-EI-GL',
      'LS-5130S-52F-EI-GL',
      'PSR150-A1-GL',
      'QSFP-100G-D-CAB-1M',
    ];
    const skus = models.map(normalizeH3cSku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it('uses the marketing model, not the BOM code, in the catalog title', () => {
    expect(
      resolveH3cCatalogName(
        '9801A3JX',
        'H3C MSR810-LM-EA Enterprise 6-Port Gigabit Ethernet 4G LTE Router',
        {
          subcategorySlug: 'router',
          specs: [
            {
              label: 'Tip',
              value: 'Enterprise Gigabit Ethernet + 4G LTE router',
            },
            { label: 'Model', value: 'MSR810-LM-EA' },
          ],
        },
      ),
    ).toBe('H3C MSR810-LM-EA 4G LTE router');
    expect(
      resolveH3cCatalogName(
        '9801A5ND',
        'H3C WA6020 Internal Antennas 4 Streams Dual Radio 802.11ax Access Point',
        {
          subcategorySlug: 'access-point',
          specs: [
            { label: 'Model', value: 'WA6020' },
            { label: 'Standart', value: 'IEEE 802.11ax/ac/n (Wi-Fi 6)' },
          ],
        },
      ),
    ).toBe('H3C WA6020 Wi-Fi 6 Access Point');
    expect(
      resolveH3cCatalogName(
        '9801A67U',
        'H3C S1600V2-18P-HPWR L2 Ethernet Switch',
        {
          subcategorySlug: 'kommutator',
          specs: [
            { label: 'Model', value: 'S1600V2-18P-HPWR' },
            { label: 'Portlar', value: '16 × 10/100/1000BASE-T PoE+' },
            { label: 'PoE', value: 'PoE+ (IEEE 802.3af/at)' },
          ],
        },
      ),
    ).toBe('H3C S1600V2-18P-HPWR 16-port PoE+ kommutator');
    expect(
      resolveH3cCatalogName(
        'LS-5130S-52F-EI-GL',
        'H3C S5130S-52F-EI L2 Ethernet Switch',
        {
          subcategorySlug: 'kommutator',
          specs: [
            { label: 'Tip', value: 'L2 Ethernet Switch (Fiber)' },
            { label: 'Model', value: 'S5130S-52F-EI' },
            { label: 'Portlar', value: '48 × 100/1000 BASE-X SFP' },
          ],
        },
      ),
    ).toBe('H3C S5130S-52F-EI 48-port fiber kommutator');
    expect(
      resolveH3cCatalogName(
        'SFP-GE-SX-MM850-A',
        '1000BASE-SX SFP Transceiver',
        {
          subcategorySlug: 'sfp-modullar',
          specs: [{ label: 'Tip', value: '1G SFP optik transceiver' }],
        },
      ),
    ).toBe('H3C SFP-GE-SX-MM850-A SFP modul');
    expect(
      resolveH3cCatalogName('0231A7R2', 'SFP+ 10Gb Module(850nm,300m,LC)', {
        subcategorySlug: 'sfp-modullar',
        specs: [{ label: 'Tip', value: '10G SFP+ optik modul' }],
      }),
    ).toBe('H3C 0231A7R2 SFP+ modul');
    expect(
      resolveH3cCatalogName('0231A0AL', 'SFP+ Cable 1.2m', {
        subcategorySlug: 'sebeke-aksesuarlari',
        specs: [
          { label: 'Tip', value: 'SFP+ DAC kabel' },
          { label: 'Sürət', value: '10 Gbps' },
          { label: 'Uzunluq', value: '1.2 m' },
        ],
      }),
    ).toBe('H3C 0231A0AL 10G DAC kabel 1.2m');
    expect(
      resolveH3cCatalogName(
        'PSR75-12A-GL',
        '75W AC Pluggable Power Supply Module',
        {
          subcategorySlug: 'sebeke-aksesuarlari',
          specs: [
            { label: 'Tip', value: 'AC pluggable enerji təchizatı modulu' },
            { label: 'Güc', value: '75 W' },
          ],
        },
      ),
    ).toBe('H3C PSR75-12A-GL 75W PSU');
    expect(
      resolveH3cCatalogName(
        'LSPM1FANSB-SN',
        'H3C Fan Module (Fan Panel Side Exhaust Airflow)',
        {
          subcategorySlug: 'sebeke-aksesuarlari',
          specs: [{ label: 'Tip', value: 'Ventilyator (fan) modulu' }],
        },
      ),
    ).toBe('H3C LSPM1FANSB-SN fan modulu');
  });

  it('does not treat Fan as a marketing model', () => {
    expect(
      h3cDisplayModel(
        'LSPM1FANSB-SN',
        'H3C Fan Module (Fan Panel Side Exhaust Airflow)',
      ),
    ).toBe('LSPM1FANSB-SN');
  });
});
