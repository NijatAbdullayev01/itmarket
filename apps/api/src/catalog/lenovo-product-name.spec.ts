import {
  buildLenovoCatalogProductName,
  buildLenovoVariantAttributes,
  buildLenovoVariantName,
  cleanLenovoModelName,
  isLenovoCatalogColorValue,
  normalizeLenovoSku,
  parseLenovoColorKeyboard,
  sanitizeLenovoRequiredSpecs,
} from './lenovo-product-name';

describe('lenovo-product-name', () => {
  it('normalizes Lenovo part numbers', () => {
    expect(normalizeLenovoSku('21UY000UFW')).toBe('21UY000UFW');
    expect(normalizeLenovoSku(' 62b8mat-3eu ')).toBe('62B8MAT-3EU');
  });

  it('keeps brand-line model without CPU RAM storage or SKU', () => {
    expect(
      buildLenovoCatalogProductName(
        'ThinkBook 14 G9',
        'ThinkBook 14 G9 IRL',
        '21UY000UFW',
      ),
    ).toBe('Lenovo ThinkBook 14 G9');
  });

  it('normalizes ThinkPad G-suffix to Gen and prefixes Lenovo', () => {
    expect(cleanLenovoModelName('ThinkPad E14 G7')).toBe(
      'Lenovo ThinkPad E14 Gen 7',
    );
    expect(cleanLenovoModelName('ThinkPad X1 Carbon G13')).toBe(
      'Lenovo ThinkPad X1 Carbon Gen 13',
    );
    expect(cleanLenovoModelName('ThinkCentre neo 50a 24 Gen 5')).toBe(
      'Lenovo ThinkCentre neo 50a 24 Gen 5',
    );
  });

  it('uses official Think* names instead of Support type titles', () => {
    expect(
      buildLenovoCatalogProductName(
        'ThinkPad E14 G7',
        'E14 Gen 7 (Type 21SX, 21SY) Laptops',
        '21SX004UFW',
      ),
    ).toBe('Lenovo ThinkPad E14 Gen 7');
    expect(
      buildLenovoCatalogProductName(
        'ThinkVision E27-40 QHD',
        'ThinkVision E27Q-40',
        '64BDGAT4EU',
      ),
    ).toBe('Lenovo ThinkVision E27Q-40');
  });

  it('uses official accessory names when Model is generic', () => {
    expect(
      buildLenovoCatalogProductName(
        'Adapter',
        'Lenovo USB-C to Ethernet Adapter',
        '4X90S91831',
      ),
    ).toBe('Lenovo USB-C to Ethernet Adapter');
    expect(
      buildLenovoCatalogProductName(
        'Dock',
        'ThinkPad Universal Thunderbolt 4 Dock - EU/INA/VIE/ROK',
        '40B00135EU',
      ),
    ).toBe('Lenovo ThinkPad Universal Thunderbolt 4 Dock');
    expect(
      buildLenovoCatalogProductName('Topload', 'Topload', '4X40T84061'),
    ).toBe('Lenovo Casual Topload T210');
  });

  it('keeps color language and layout out of accessory names', () => {
    expect(
      cleanLenovoModelName(
        'Lenovo Wireless Multi-Mode Pro Plus Mouse 6050 (Eclipse Black)',
      ),
    ).toBe('Lenovo Wireless Multi-Mode Pro Plus Mouse 6050');
    expect(
      cleanLenovoModelName('Lenovo 16-inch Laptop Backpack B210 Black(ECO)'),
    ).toBe('Lenovo 16-inch Laptop Backpack B210 Eco');
    expect(
      cleanLenovoModelName(
        'Lenovo Essential Wireless Combo Keyboard & Mouse (Latin American Spanish 171)',
      ),
    ).toBe('Lenovo Essential Wireless Combo Keyboard and Mouse');
  });

  it('does not treat monitor gamut as a catalog color', () => {
    expect(isLenovoCatalogColorValue('99% sRGB')).toBe(false);
    expect(isLenovoCatalogColorValue('Luna Grey')).toBe(true);
  });

  it('splits color and Russian keyboard from the combined Excel field', () => {
    expect(parseLenovoColorKeyboard('Luna Grey, RU klaviatura')).toEqual({
      color: 'Luna Grey',
      keyboard: 'RU',
    });
    expect(parseLenovoColorKeyboard('RU klaviatura')).toEqual({
      color: null,
      keyboard: 'RU',
    });
  });

  it('puts only RAM storage and real color on the variant', () => {
    expect(
      buildLenovoVariantName([
        { label: 'Prosessor', value: 'Intel Core 5 210H' },
        { label: 'RAM', value: '8 GB' },
        { label: 'Yaddaş', value: '512 GB SSD' },
      ]),
    ).toBe('512 GB SSD / 8 GB');

    expect(
      buildLenovoVariantAttributes([
        { label: 'Prosessor', value: 'Intel Core 5 210H' },
        { label: 'RAM', value: '8 GB' },
        { label: 'Yaddaş', value: '512 GB SSD' },
        { label: 'Rəng', value: 'Luna Grey' },
        { label: 'Ekran', value: '14" WUXGA' },
      ]),
    ).toEqual({
      Yaddaş: '512 GB SSD',
      RAM: '8 GB',
      Rəng: 'Luna Grey',
    });
  });

  it('stores a cleaned Model spec without platform codes', () => {
    expect(
      sanitizeLenovoRequiredSpecs([
        { label: 'Model', value: 'ThinkBook 14 G9 IRL' },
        { label: 'Yaddaş', value: '512 GB SSD' },
      ]),
    ).toEqual([
      { label: 'Model', value: 'Lenovo ThinkBook 14 G9' },
      { label: 'Yaddaş', value: '512 GB SSD' },
    ]);
  });
});
