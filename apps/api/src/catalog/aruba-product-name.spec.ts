import {
  arubaDisplayModel,
  normalizeArubaSku,
  resolveArubaCatalogName,
} from './aruba-product-name';

const SWITCH: Array<{
  sku: string;
  title: string;
  expected: string;
}> = [
  {
    sku: 'R8R44A',
    title: 'HPE Instant On 1430 5G Switch',
    expected: 'Aruba Instant On 1430 5G kommutator',
  },
  {
    sku: 'R8R46A',
    title: 'HPE Instant On 1430 8G Class4 PoE 64W Switch',
    expected: 'Aruba Instant On 1430 8G PoE 64W kommutator',
  },
  {
    sku: 'R8R50A',
    title: 'HPE Instant On 1430 26G 2SFP Switch',
    expected: 'Aruba Instant On 1430 26G 2SFP kommutator',
  },
  {
    sku: 'JL811A',
    title: 'HPE Instant On 1830 8G 4p Class4 PoE 65W Switch',
    expected: 'Aruba Instant On 1830 8G PoE 65W kommutator',
  },
  {
    sku: 'JL683A',
    title: 'HPE Instant On 1930 24G 4SFP+ Class4 PoE 195W Switch',
    expected: 'Aruba Instant On 1930 24G 4SFP+ PoE 195W kommutator',
  },
  {
    sku: 'JL683B',
    title: 'HPE Instant On 1930 24G 4SFP+ Class4 PoE 195W Switch (B)',
    expected: 'Aruba Instant On 1930 24G 4SFP+ PoE 195W (B) kommutator',
  },
  {
    sku: 'S0F35A',
    title: 'HPE Instant On 1960 8G CL4 4p 2.5G CL6 PoE 2XGT 2SFP+ 480W Switch',
    expected: 'Aruba Instant On 1960 8G 2.5G PoE 2XGT 2SFP+ 480W kommutator',
  },
  {
    sku: 'R8N89A',
    title: 'HPE Aruba CX 6000 12G Class4 PoE 2G/2SFP 139W Switch',
    expected: 'Aruba CX 6000 12G PoE 2G/2SFP 139W kommutator',
  },
  {
    sku: 'JL726B',
    title: 'HPE Aruba CX 6200F 48G 4SFP+ Switch (B)',
    expected: 'Aruba CX 6200F 48G 4SFP+ (B) kommutator',
  },
  {
    sku: 'JL557A',
    title: 'Aruba 2930F 48G PoE+ 4SFP 740W Switch',
    expected: 'Aruba 2930F 48G PoE 4SFP 740W kommutator',
  },
  {
    sku: 'JL558A',
    title: 'Aruba 2930F 48G PoE+ 4SFP+ 740W Switch',
    expected: 'Aruba 2930F 48G PoE 4SFP+ 740W kommutator',
  },
];

describe('aruba-product-name', () => {
  it('normalizes Excel part numbers into unique SKUs', () => {
    expect(normalizeArubaSku(' r8r44a ')).toBe('R8R44A');
    expect(normalizeArubaSku('JL683B')).toBe('JL683B');
    const skus = SWITCH.map((row) => normalizeArubaSku(row.sku));
    expect(new Set(skus).size).toBe(skus.length);
  });

  it('uses marketing family and compact config, not the HPE prefix', () => {
    for (const row of SWITCH) {
      expect(
        resolveArubaCatalogName(row.sku, row.title, {
          subcategorySlug: 'kommutator',
        }),
      ).toBe(row.expected);
    }
  });

  it('names access points by Instant On / AP model and Wi-Fi generation', () => {
    expect(
      resolveArubaCatalogName(
        'R4W02A',
        'HPE Instant On AP22 (RW) Wi-Fi 6 2×2 Indoor AP',
        { subcategorySlug: 'access-point' },
      ),
    ).toBe('Aruba Instant On AP22 Wi-Fi 6 Access Point');
    expect(
      resolveArubaCatalogName(
        'R2X16A',
        'HPE Instant On AP11D (RW) Wi-Fi 5 Desktop/Hospitality AP',
        { subcategorySlug: 'access-point' },
      ),
    ).toBe('Aruba Instant On AP11D desktop Wi-Fi 5 Access Point');
    expect(
      resolveArubaCatalogName(
        'S1T37A',
        'HPE Instant On AP27 (RW) Wi-Fi 6 2×2 Outdoor AP',
        { subcategorySlug: 'access-point' },
      ),
    ).toBe('Aruba Instant On AP27 outdoor Wi-Fi 6 Access Point');
    expect(
      resolveArubaCatalogName(
        'R2H28A',
        'Aruba AP-505 (RW) Unified Wi-Fi 6 2×2 AP',
        { subcategorySlug: 'access-point' },
      ),
    ).toBe('Aruba AP-505 Wi-Fi 6 Access Point');
  });

  it('names optics, DAC, mounts and gateways without datasheet clauses', () => {
    expect(
      resolveArubaCatalogName(
        'R9D16A',
        'HPE Instant On 1G SFP LC SX 500m MMF Transceiver',
        { subcategorySlug: 'sfp-modullar' },
      ),
    ).toBe('Aruba Instant On 1G SFP SX modul');
    expect(
      resolveArubaCatalogName(
        'S2P33A',
        'HPE Aruba 25G SFP28 LC SR 100m MMF Transceiver',
        { subcategorySlug: 'sfp-modullar' },
      ),
    ).toBe('Aruba 25G SFP28 SR modul');
    expect(
      resolveArubaCatalogName(
        'S0G18A',
        'HPE Instant On 10GBASE-T RJ45 30m Transceiver',
        { subcategorySlug: 'sfp-modullar' },
      ),
    ).toBe('Aruba Instant On 10G RJ45 modul');
    expect(
      resolveArubaCatalogName(
        'J9281D',
        'Aruba 10G SFP+ to SFP+ 1m DAC Cable',
        { subcategorySlug: 'sebeke-aksesuarlari' },
      ),
    ).toBe('Aruba 10G DAC kabel 1m');
    expect(
      resolveArubaCatalogName(
        'R3J18A',
        'Aruba AP-MNT-D Ceiling Mount Bracket (5xx/6xx/7xx)',
        { subcategorySlug: 'sebeke-aksesuarlari' },
      ),
    ).toBe('Aruba AP-MNT-D tavan montajı');
    expect(
      resolveArubaCatalogName(
        'S0G33A',
        'HPE Instant On SG1004 4p Gigabit Secure Gateway',
        {
          subcategorySlug: 'router',
          specs: [{ label: 'PoE', value: 'Yoxdur' }],
        },
      ),
    ).toBe('Aruba Instant On SG1004 Secure Gateway');
    expect(
      resolveArubaCatalogName(
        'S0G34A',
        'HPE Instant On SG2505P 5p 2.5G 64W PoE Secure Gateway',
        { subcategorySlug: 'router' },
      ),
    ).toBe('Aruba Instant On SG2505P PoE Secure Gateway');
    expect(
      resolveArubaCatalogName(
        'JW118A',
        'Aruba PC-AC-EC AC Power Cord (Europe)',
        {
          subcategorySlug: 'sebeke-aksesuarlari',
          specs: [
            {
              label: 'Uyğunluq',
              value: 'Instant On injektor, adapter və seçilmiş AP/switch PSU',
            },
          ],
        },
      ),
    ).toBe('Aruba PC-AC-EC qida kabeli');
  });

  it('keeps switch display models unique across PoE and B-refresh SKUs', () => {
    const names = SWITCH.map((row) =>
      resolveArubaCatalogName(row.sku, row.title, {
        subcategorySlug: 'kommutator',
      }),
    );
    expect(new Set(names).size).toBe(names.length);
    expect(arubaDisplayModel('JL683A', SWITCH[4]!.title, [], 'kommutator')).toBe(
      'Instant On 1930 24G 4SFP+ PoE 195W',
    );
  });
});
