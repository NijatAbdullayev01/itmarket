import {
  hyperxDisplayModel,
  listHyperxCatalogNameSkus,
  normalizeHyperxSku,
  resolveHyperxCatalogName,
} from './hyperx-product-name';

const SAMPLES: Array<{
  sku: string;
  title: string;
  expected: string;
  model: string;
}> = [
  {
    sku: '64V61AA',
    title: 'HyperX Armada 25 FHD Gaming Monitor',
    expected: 'HyperX Armada 25 FHD oyun monitoru',
    model: 'Armada 25 FHD',
  },
  {
    sku: '7G8F4AA',
    title: 'HyperX Cloud Mini - Gaming Headset (Black)',
    expected: 'HyperX Cloud Mini Qara oyun qulaqlığı',
    model: 'Cloud Mini Qara',
  },
  {
    sku: '4P5D4AA',
    title: 'HyperX Cloud Alpha - Wireless Gaming Headset (Black-Red)',
    expected: 'HyperX Cloud Alpha Wireless Qara-qırmızı simsiz oyun qulaqlığı',
    model: 'Cloud Alpha Wireless Qara-qırmızı',
  },
  {
    sku: '727A5AA',
    title: 'HyperX Cirro Buds Pro True Wireless BLK Earbuds',
    expected: 'HyperX Cirro Buds Pro Qara TWS qulaqlıq',
    model: 'Cirro Buds Pro Qara',
  },
  {
    sku: '705L8AA',
    title: 'HyperX Cloud Earbuds II RED',
    expected: 'HyperX Cloud Earbuds II Qırmızı qulaqici qulaqlıq',
    model: 'Cloud Earbuds II Qırmızı',
  },
  {
    sku: '4P5P8AA',
    title: 'HyperX SoloCast - USB Microphone (Black)',
    expected: 'HyperX SoloCast Qara USB mikrofon',
    model: 'SoloCast Qara',
  },
  {
    sku: '786H6AA',
    title: 'HyperX Caster',
    expected: 'HyperX Caster mikrofon qolu',
    model: 'Caster',
  },
  {
    sku: '4P5N0AA',
    title: 'HyperX Alloy Origins 60 (HX Red)',
    expected: 'HyperX Alloy Origins 60 HX Red oyun klaviaturası',
    model: 'Alloy Origins 60 HX Red',
  },
  {
    sku: '91Y91AA',
    title: 'HyperX Alloy Rise 75 Wireless - Gaming Keyboard',
    expected: 'HyperX Alloy Rise 75 simsiz oyun klaviaturası',
    model: 'Alloy Rise 75',
  },
  {
    sku: '6N0B0AA',
    title: 'HyperX Pulsefire Haste 2 - Wireless Gaming Mouse (Black)',
    expected: 'HyperX Pulsefire Haste 2 Qara simsiz oyun siçanı',
    model: 'Pulsefire Haste 2 Qara',
  },
  {
    sku: '4Z7X5AA',
    title: 'HyperX Pulsefire Mat - Gaming Mouse Pad - Cloth (XL)',
    expected: 'HyperX Pulsefire Mat XL siçan altlığı',
    model: 'Pulsefire Mat XL',
  },
  {
    sku: '8C524AA',
    title: 'HyperX Delta Backpack',
    expected: 'HyperX Delta Backpack oyun çantası',
    model: 'Delta Backpack',
  },
  {
    sku: '75X30AA',
    title: 'HyperX Vision S Webcam',
    expected: 'HyperX Vision S veb kamera',
    model: 'Vision S',
  },
  {
    sku: '7D6H2AA',
    title: 'HyperX Clutch Gladiate - Wired Gaming RGB Controller - Xbox',
    expected: 'HyperX Clutch Gladiate oyun pultu',
    model: 'Clutch Gladiate',
  },
  {
    sku: '51P68AA',
    title: 'HyperX ChargePlay Duo - Controller Charging Station for PS5',
    expected: 'HyperX ChargePlay Duo PS5 şarj stansiyası',
    model: 'ChargePlay Duo PS5',
  },
  {
    sku: '73C12AA',
    title: 'HyperX Audio Mixer 20 - 20000 Hz Black',
    expected: 'HyperX Audio Mixer audio mikser',
    model: 'Audio Mixer',
  },
];

describe('hyperx-product-name', () => {
  it('normalizes Excel part numbers into unique SKUs', () => {
    expect(normalizeHyperxSku(' 4p5l1ax ')).toBe('4P5L1AX');
    expect(normalizeHyperxSku('64V61AA')).toBe('64V61AA');
    const skus = listHyperxCatalogNameSkus().map((sku) =>
      normalizeHyperxSku(sku),
    );
    expect(new Set(skus).size).toBe(skus.length);
    expect(skus).toHaveLength(98);
  });

  it('uses marketing model and short type without datasheet clauses', () => {
    for (const row of SAMPLES) {
      expect(resolveHyperxCatalogName(row.sku, row.title)).toBe(row.expected);
      expect(hyperxDisplayModel(row.sku, row.title)).toBe(row.model);
    }
  });

  it('keeps regional Cloud Alpha SKUs on the same marketing name', () => {
    expect(
      resolveHyperxCatalogName('4P5L1AX', 'HyperX Cloud Alpha (Qara-qırmızı)'),
    ).toBe(
      resolveHyperxCatalogName('4P5L1AM', 'HyperX Cloud Alpha (Qara-qırmızı)'),
    );
  });

  it('prefixes HyperX on unknown titles', () => {
    expect(resolveHyperxCatalogName('UNKNOWN1', 'Demo Pad')).toBe(
      'HyperX Demo Pad',
    );
    expect(resolveHyperxCatalogName('UNKNOWN1', 'HyperX Demo Pad')).toBe(
      'HyperX Demo Pad',
    );
  });
});
