import {
  isMarketingCatalogTitle,
  manufacturerModelFromCatalogSlug,
  replaceSpecModel,
  resolveManufacturerModel,
} from './catalog-manufacturer-model';

describe('resolveManufacturerModel', () => {
  it('uses the current SKU when Model is a marketing title', () => {
    expect(
      resolveManufacturerModel({
        productName: 'APC EASY UPS BV 1000VA, AVR, Schuko Outlet, 230V',
        sku: 'BV1000I-GR',
        specs: [{ label: 'Güc', value: '1.000 VA / 600 W' }],
      }),
    ).toBe('BV1000I-GR');
  });

  it('prefers a compact Model spec over an article SKU', () => {
    expect(
      resolveManufacturerModel({
        productName: 'UGREEN HDMI 4K kabel 2 m qara',
        sku: '10107',
        specs: [
          { label: 'Model', value: 'HD104' },
          { label: 'Uzunluq', value: '2 m' },
        ],
      }),
    ).toBe('HD104');
  });

  it('keeps a short product-line model from specs for Dell', () => {
    expect(
      resolveManufacturerModel({
        productName: 'Alienware AW2723DF',
        sku: '210-BFII',
        specs: [{ label: 'Model', value: 'Alienware AW2723DF' }],
      }),
    ).toBe('Alienware AW2723DF');
  });

  it('stays idempotent after SKU is auto-generated', () => {
    expect(
      resolveManufacturerModel({
        productName: 'BV1000I-GR',
        sku: 'APC-BV1000IGR',
        specs: [{ label: 'Güc', value: '1.000 VA / 600 W' }],
      }),
    ).toBe('BV1000I-GR');
  });

  it('recovers a part number from slug fallback when the title was kept as model', () => {
    expect(
      resolveManufacturerModel({
        productName: 'APC Easy UPS 10000VA 230V',
        sku: 'APC-APCEASYUPSVA230V',
        specs: [],
        fallbackModel: 'SRV10KI',
        skuLooksSiteGenerated: true,
      }),
    ).toBe('SRV10KI');
  });

  it('replaces an existing Model spec value', () => {
    expect(
      replaceSpecModel(
        [
          { label: 'Model', value: 'wrong title' },
          { label: 'Güc', value: '600 W' },
        ],
        'BV1000I-GR',
      ),
    ).toEqual([
      { label: 'Model', value: 'BV1000I-GR' },
      { label: 'Güc', value: '600 W' },
    ]);
  });

  it('restores a dotted battery model from the SEO title', () => {
    expect(
      resolveManufacturerModel({
        productName: 'NP5-0-12',
        sku: 'ENOT-NP5012',
        specs: [],
        brandName: 'ENOT',
        seoTitle: 'ENOT NP5.0-12 12V 5Ah UPS batareyası',
        skuLooksSiteGenerated: true,
      }),
    ).toBe('NP5.0-12');
  });

  it('reads a manufacturer code from the previous catalog slug', () => {
    expect(manufacturerModelFromCatalogSlug('apc', 'apc-srv10ki')).toBe(
      'SRV10KI',
    );
    expect(manufacturerModelFromCatalogSlug('apc', 'apc-bv1000i-gr')).toBe(
      'BV1000I-GR',
    );
  });

  it('detects marketing titles', () => {
    expect(
      isMarketingCatalogTitle(
        'APC EASY UPS BV 1000VA, AVR, Schuko Outlet, 230V',
      ),
    ).toBe(true);
    expect(isMarketingCatalogTitle('BV1000I-GR')).toBe(false);
    expect(isMarketingCatalogTitle('Alienware AW2723DF')).toBe(false);
  });
});
