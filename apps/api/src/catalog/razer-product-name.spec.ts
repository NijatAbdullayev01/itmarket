import {
  listRazerCatalogNameSkus,
  normalizeRazerSku,
  razerDisplayModel,
  resolveRazerCatalogName,
} from './razer-product-name';

export const RAZER_EXCEL_RAW_SKUS = [
  'RZ04-05180100-R3M1',
  'RZ04-05170100-R3M1',
  'RZ04-05220100-R3M1',
  'RZ04-05410100-R3M1',
  'RZ04-05420200-R3M1',
  'RZ04-04530100-R3M1',
  'RZ04-04530200-R3M1',
  'RZ04-03750300-R3M1',
  'RZ04-04960100-R3M1',
  'RZ04-05220200-R3M1',
  'RZ04-03241000-R3G1',
  'RZ04-03241300-R3G1',
  'RZ04-02950100-R381',
  'RZ04-03240100-R3M1',
  'RZ04-03240700-R3M1',
  'RZ04-03240800-R3M1',
  'RZ04-04430100-R3M1',
  'RZ04-04730100-R3M1',
  'RZ04-05160100-R3M1',
  'RZ04-05220300-R3M1',
  'RZ04-05220400-R3M1',
  'RZ04-05350100-R3M1',
  'RZ04-05350200-R3M1',
  'RZ04-05350300-R3M1',
  'RZ04-05400800-R3M1',
  'RZ04-05420100-R3M1',
  'RZ04-03240900-R3M1',
  'RZ04-05400100-R3M1',
  'RZ04-05410400-R3M1',
  'RZ04-05410200-R3M1',
  'RZ04-05410300-R3G1',
  'RZ05-04760100-R3G1',
  'RZ03-04692500-R3R1',
  'RZ03-03490700-R3R1',
  'RZ03-04702500-R3R1',
  'RZ03-03390200-R3M1',
  'RZ03-04700800-R3R1',
  'RZ03-04881600-R3R1',
  'RZ03-04460100-R3M1',
  'RZ03-05520100-R3M1',
  'RZ03-02360100-R3M1',
  'RZ03-04470800-R3R1',
  'RZ03-05130100-R3M1',
  'RZ03-05450100-R3M1',
  'RZ03-03391500-R3R1',
  'RZ03-05003300-R3M1',
  'RZ03-05003500-R3M1',
  'RZ03-05530100-R3M1',
  'RZ03-04110100-R3M1',
  'RZ03-05270100-R3M1',
  'RZ03-05270800-R3M1',
  'RZ03-05271500-R3M1',
  'RZ03-05450500-R3M1',
  'RZ03-03392200-R3R1',
  'RZ03-04990100-R3M1',
  'RZ01-04630100-R3G1',
  'RZ01-03730100-R3G1',
  'RZ01-03730400-R3G1',
  'RZ01-03900100-R3M1',
  'RZ01-04620100-R3G1',
  'RZ01-04620200-R3G1',
  'RZ01-04640100-R3M1',
  'RZ01-05230100-R3M1',
  'RZ01-04630200-R3G1',
  'RZ01-05140100-R3G1',
  'RZ01-04130100-R3G1',
  'RZ01-03850100-R3M1',
  'RZ01-03850200-R3M1',
  'RZ01-04310100-R3G1',
  'RZ01-04660200-R3G1',
  'RZ01-04870100-R3G1',
  'RZ01-04910100-R3M1',
  'RZ01-05120100-R3G1',
  'RZ01-05120200-R3G1',
  'RZ01-05120800-R3M1',
  'RZ01-05240100-R3G1',
  'RZ01-05240200-R3G1',
  'RZ01-05240300-R3G1',
  'RZ01-05240400-R3G1',
  'RZ01-05250100-R3G1',
  'RZ01-05330100-R3G1',
  'RZ01-05330200-R3G1',
  'RZ01-05570100-R3G1',
  'RZ01-04000100-R3M1',
  'RZ01-04650100-R3M1',
  'RZ01-04660100-R3G1',
  'RZ02-03810100-R3M1',
  'RZ02-04890100-R3M1',
  'RZ02-04890200-R3M1',
  'RZ02-01820200-R3M1',
  'RZ02-01820500-R3M1',
  'RZ02-03330200-R3M1',
  'RZ02-03330400-R3M1',
  'RZ02-03330500-R3M1',
  'RZ02-03332300-R3M1',
  'RZ02-04920300-R3M1',
  'RZ02-04920400-R3M1',
  'RZ02-03333300-R3M1',
  'RZ02-03330300-R3M1',
  'RZ02-02500700-R3M1',
  'RZ02-04920100-R3M1',
  'RC81-03650101-0000',
  'RC81-03630101-0000',
  'RC81-03630116-0000',
  'RZ38-04900300-R3G1',
  'RZ38-05310100-R3G1',
  'RZ38-05310200-R3G1',
  'RZ19-05050300-R3M1',
  'RZ19-05060100-R3M1',
  'RZ19-05060200-R3M1',
  'RC30-474C0100-R3M1',
  'RZ06-05540100-R3M1',
  'RZ06-05210100-R3M1',
  'RZ06-05210200-R3M1',
] as const;

const SAMPLES: Array<{
  sku: string;
  title: string;
  expected: string;
  model: string;
}> = [
  {
    sku: 'RZ04-05180100-R3M1',
    title: 'Razer Kraken V4 X qara USB oyun qulaqlığı',
    expected: 'Razer Kraken V4 X qara USB oyun qulaqlığı',
    model: 'Kraken V4 X qara',
  },
  {
    sku: 'RZ04-05170100-R3M1',
    title: 'Razer Kraken V4 qara simsiz oyun qulaqlığı',
    expected: 'Razer Kraken V4 qara simsiz oyun qulaqlığı',
    model: 'Kraken V4 qara',
  },
  {
    sku: 'RZ03-05450100-R3M1',
    title: 'Razer BlackWidow V4 Low-profile TKL HyperSpeed Yellow EN',
    expected:
      'Razer BlackWidow V4 Low-profile TKL HyperSpeed Yellow EN simsiz oyun klaviaturası',
    model: 'BlackWidow V4 Low-profile TKL HyperSpeed Yellow EN',
  },
  {
    sku: 'RZ01-04630100-R3G1',
    title: 'Razer DeathAdder V3 Pro qara simsiz oyun siçanı',
    expected: 'Razer DeathAdder V3 Pro qara simsiz oyun siçanı',
    model: 'DeathAdder V3 Pro qara',
  },
  {
    sku: 'RZ02-02500700-R3M1',
    title: 'Razer Goliathus Chroma 3XL RGB desk-mat',
    expected: 'Razer Goliathus Chroma 3XL RGB siçan altlığı',
    model: 'Goliathus Chroma 3XL RGB',
  },
  {
    sku: 'RC81-03650101-0000',
    title: 'Razer Rogue V3 17.3" oyun çantası',
    expected: 'Razer Rogue V3 17.3" oyun çantası',
    model: 'Rogue V3 17.3"',
  },
  {
    sku: 'RZ38-04900300-R3G1',
    title: 'Razer Iskur V2 parça tünd boz oyun kreslosu',
    expected: 'Razer Iskur V2 parça tünd boz oyun kreslosu',
    model: 'Iskur V2 parça tünd boz',
  },
  {
    sku: 'RZ05-04760100-R3G1',
    title: 'Razer Nommo V2 X qara 2.0 oyun dinamiki',
    expected: 'Razer Nommo V2 X qara 2.0 oyun dinamiki',
    model: 'Nommo V2 X qara 2.0',
  },
  {
    sku: 'RZ19-05060100-R3M1',
    title: 'Razer Seiren V3 Chroma qara USB oyun mikrofonu',
    expected: 'Razer Seiren V3 Chroma qara USB oyun mikrofonu',
    model: 'Seiren V3 Chroma qara',
  },
  {
    sku: 'RZ06-05540100-R3M1',
    title: 'Razer Wolverine V3 Pro 8K PC simsiz oyun pultu',
    expected: 'Razer Wolverine V3 Pro 8K PC simsiz oyun pultu',
    model: 'Wolverine V3 Pro 8K PC',
  },
];

describe('razer-product-name', () => {
  it('normalizes Excel part numbers into unique SKUs', () => {
    expect(normalizeRazerSku(' rz04-05180100-r3m1 ')).toBe(
      'RZ04-05180100-R3M1',
    );
    expect(normalizeRazerSku('RC81-03650101-0000')).toBe('RC81-03650101-0000');
    const skus = RAZER_EXCEL_RAW_SKUS.map(normalizeRazerSku);
    expect(new Set(skus).size).toBe(skus.length);
    expect(skus).toEqual(expect.arrayContaining(listRazerCatalogNameSkus()));
  });

  it('covers every razer.xlsx SKU with a catalog title', () => {
    expect(listRazerCatalogNameSkus()).toEqual(
      RAZER_EXCEL_RAW_SKUS.map(normalizeRazerSku),
    );
    expect(listRazerCatalogNameSkus()).toHaveLength(114);
  });

  it('keeps marketing model and short type without datasheet clauses', () => {
    for (const row of SAMPLES) {
      expect(resolveRazerCatalogName(row.sku, row.title)).toBe(row.expected);
      expect(razerDisplayModel(row.sku, row.title)).toBe(row.model);
    }
  });

  it('prefixes Razer on unknown titles', () => {
    expect(resolveRazerCatalogName('UNKNOWN1', 'Demo Pad')).toBe(
      'Razer Demo Pad',
    );
    expect(resolveRazerCatalogName('UNKNOWN1', 'Razer Demo Pad')).toBe(
      'Razer Demo Pad',
    );
  });
});
