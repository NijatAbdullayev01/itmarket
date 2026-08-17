import {
  ensureBluettiModelSpec,
  isBluettiCompactCodeName,
  listBluettiCatalogNameSkus,
  normalizeBluettiSku,
  resolveBluettiCatalogName,
} from './bluetti-product-name';

describe('bluetti-product-name', () => {
  it('detects compact manufacturer codes', () => {
    expect(isBluettiCompactCodeName('AC180P')).toBe(true);
    expect(isBluettiCompactCodeName('PV120')).toBe(true);
    expect(
      isBluettiCompactCodeName('Bluetti AC180P 1800W enerji stansiyası'),
    ).toBe(false);
  });

  it('covers every Bluetti catalog SKU', () => {
    expect(listBluettiCatalogNameSkus()).toEqual([
      'AC180P',
      'AC200PL',
      'AC2P',
      'AC50P',
      'AC70P',
      'MP200',
      'PV120',
      'PV350',
    ]);
  });

  it('resolves marketing titles and keeps Model specs', () => {
    expect(normalizeBluettiSku('ac180p')).toBe('AC180P');
    expect(resolveBluettiCatalogName('AC180P', 'AC180P')).toBe(
      'Bluetti AC180P 1800W enerji stansiyası',
    );
    expect(
      ensureBluettiModelSpec(
        [{ label: 'Kapasitet', value: '1.440 Wh' }],
        'AC180P',
      ),
    ).toEqual([
      { label: 'Model', value: 'AC180P' },
      { label: 'Kapasitet', value: '1.440 Wh' },
    ]);
  });
});
