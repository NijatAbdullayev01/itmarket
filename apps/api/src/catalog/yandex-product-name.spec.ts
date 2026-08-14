import {
  normalizeYandexSku,
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
