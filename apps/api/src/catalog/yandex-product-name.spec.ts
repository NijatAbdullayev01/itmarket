import {
  ensureYandexModelSpec,
  isYandexCompactCodeName,
  normalizeYandexSku,
  preferYandexMarketingTitle,
  resolveYandexCatalogName,
  yandexDisplayModel,
} from './yandex-product-name';

describe('yandex-product-name', () => {
  it('normalizes Excel model codes into unique SKUs', () => {
    expect(normalizeYandexSku('YNDX-00020 Black')).toBe('YNDX-00020-BLACK');
    expect(normalizeYandexSku('YNDX-00020B')).toBe('YNDX-00020B');
    expect(normalizeYandexSku('YNDX-00026GRY')).toBe('YNDX-00026GRY');
    expect(normalizeYandexSku('  YNDX-00510  ')).toBe('YNDX-00510');

    const models = [
      'YNDX-00020 Black',
      'YNDX-00020B',
      'YNDX-00020 Gray',
      'YNDX-00020R',
      'YNDX-00026GRY',
      'YNDX-00030BLK',
      'YNDX-00510',
    ];
    const skus = models.map(normalizeYandexSku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it('detects compact Yandex manufacturer codes', () => {
    expect(isYandexCompactCodeName('YNDX-00020-BLACK')).toBe(true);
    expect(isYandexCompactCodeName('YNDX-0007W')).toBe(true);
    expect(isYandexCompactCodeName('YNDX-00510')).toBe(true);
    expect(
      isYandexCompactCodeName('Yandex Stansiya Mini Plus saatlı, qara'),
    ).toBe(false);
  });

  it('stores the compact code as Model in requiredSpecs', () => {
    expect(
      ensureYandexModelSpec(
        [{ label: 'Tip', value: 'Ağıllı kolonka' }],
        'YNDX-00020 Black',
      ),
    ).toEqual([
      { label: 'Model', value: 'YNDX-00020-BLACK' },
      { label: 'Tip', value: 'Ağıllı kolonka' },
    ]);
  });

  it('prefers marketing titles over compact codes', () => {
    expect(
      preferYandexMarketingTitle(
        'Yandex Stansiya Mini Plus saatlı, qara',
        'YNDX-00020-BLACK',
      ),
    ).toBe('Yandex Stansiya Mini Plus saatlı, qara');
  });

  it('keeps Azerbaijani Excel titles and Yandex brand prefix', () => {
    expect(
      resolveYandexCatalogName(
        'YNDX-00020 Black',
        'Yandex Stansiya Mini Plus 10 Vt saatlı ağıllı kolonka, qara',
      ),
    ).toBe('Yandex Stansiya Mini Plus 10 Vt saatlı ağıllı kolonka, qara');
    expect(
      resolveYandexCatalogName('YNDX-00510', 'Hub ağıllı ev mərkəzi Zigbee'),
    ).toBe('Yandex Hub ağıllı ev mərkəzi Zigbee');
    expect(resolveYandexCatalogName('YNDX-00510', '')).toBe(
      'Yandex YNDX-00510',
    );
    expect(resolveYandexCatalogName('YNDX-00510', 'YNDX-00510')).toBe(
      'Yandex YNDX-00510',
    );
  });

  it('reads a short display model from the series spec', () => {
    expect(
      yandexDisplayModel(
        'Yandex Stansiya Mini Plus 10 Vt saatlı ağıllı kolonka, qara',
        [
          {
            label: 'Seriya',
            value: 'Yandex Stansiya Mini Plus (Mini 2, saatlı)',
          },
        ],
      ),
    ).toBe('Stansiya Mini Plus');
  });
});
