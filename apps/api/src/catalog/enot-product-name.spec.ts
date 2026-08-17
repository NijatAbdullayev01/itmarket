import {
  ensureEnotModelSpec,
  isEnotCompactCodeName,
  listEnotCatalogNameSkus,
  normalizeEnotSku,
  resolveEnotCatalogName,
} from './enot-product-name';

describe('enot-product-name', () => {
  it('covers every ENOT Excel SKU with a catalog title', () => {
    expect(listEnotCatalogNameSkus()).toEqual([
      'NP12-12',
      'NP5.0-12',
      'NP7.0-12',
      'NP7.5-12',
    ]);
  });

  it('detects compact manufacturer codes', () => {
    expect(isEnotCompactCodeName('NP5.0-12')).toBe(true);
    expect(isEnotCompactCodeName('ENOT NP5.0-12 12V 5Ah UPS batareyası')).toBe(
      false,
    );
  });

  it('strips regional /AZ suffix from Excel model codes', () => {
    expect(normalizeEnotSku('NP7.5-12/AZ')).toBe('NP7.5-12');
    expect(normalizeEnotSku('np12-12')).toBe('NP12-12');
  });

  it('keeps voltage and capacity without English battery wording', () => {
    expect(
      resolveEnotCatalogName('NP12-12', 'ENOT NP12-12 battery 12V 12Ah'),
    ).toBe('ENOT NP12-12 12V 12Ah UPS batareyası');
    expect(
      resolveEnotCatalogName('NP7.5-12/AZ', 'ENOT NP7.5-12 battery 12V 7.5Ah'),
    ).toBe('ENOT NP7.5-12 12V 7.5Ah UPS batareyası');
  });

  it('prefixes ENOT on unknown titles and stores Model', () => {
    expect(resolveEnotCatalogName('UNKNOWN-SKU', 'Demo Pack')).toBe(
      'ENOT Demo Pack',
    );
    expect(resolveEnotCatalogName('UNKNOWN-SKU', 'ENOT Demo battery')).toBe(
      'ENOT Demo UPS batareyası',
    );
    expect(ensureEnotModelSpec([], 'NP5.0-12')).toEqual([
      { label: 'Model', value: 'NP5.0-12' },
    ]);
  });
});
