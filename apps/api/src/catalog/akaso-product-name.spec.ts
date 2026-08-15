import {
  listAkasoCatalogNameSkus,
  normalizeAkasoSku,
  resolveAkasoCatalogName,
} from './akaso-product-name';

describe('akaso-product-name', () => {
  it('normalizes Excel model codes into unique SKUs', () => {
    expect(normalizeAkasoSku('AKASO360 Creator Combo')).toBe(
      'AKASO360-CREATOR-COMBO',
    );
    expect(normalizeAkasoSku('Brave 8 Sport Combo')).toBe(
      'BRAVE-8-SPORT-COMBO',
    );
    expect(normalizeAkasoSku('Brave 4 Pro Sport Combo')).toBe(
      'BRAVE-4-PRO-SPORT-COMBO',
    );
    expect(normalizeAkasoSku('  V50 Elite ')).toBe('V50-ELITE');
    expect(normalizeAkasoSku('Brave 4')).toBe('BRAVE-4');

    const models = [
      'AKASO360 Creator Combo',
      'Brave 8 Sport Combo',
      'Brave 4 Pro Sport Combo',
      'V50 Elite',
      'Brave 4',
    ];
    const skus = models.map(normalizeAkasoSku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it('covers every AKASO Excel SKU with a catalog title', () => {
    expect(listAkasoCatalogNameSkus()).toEqual([
      'AKASO360-CREATOR-COMBO',
      'BRAVE-8-SPORT-COMBO',
      'BRAVE-4-PRO-SPORT-COMBO',
      'V50-ELITE',
      'BRAVE-4',
    ]);
  });

  it('keeps series and short type without datasheet clauses', () => {
    expect(
      resolveAkasoCatalogName(
        'AKASO360 Creator Combo',
        'AKASO360 Creator Combo',
      ),
    ).toBe('AKASO 360 Creator Combo 360° kamera');
    expect(
      resolveAkasoCatalogName('Brave 8 Sport Combo', 'Brave 8 Sport Combo'),
    ).toBe('AKASO Brave 8 Sport Combo ekşn kamera');
    expect(resolveAkasoCatalogName('V50 Elite', 'V50 Elite')).toBe(
      'AKASO V50 Elite ekşn kamera',
    );
    expect(resolveAkasoCatalogName('Brave 4', 'Brave 4')).toBe(
      'AKASO Brave 4 ekşn kamera',
    );
  });

  it('prefixes AKASO on unknown titles', () => {
    expect(resolveAkasoCatalogName('UNKNOWN-SKU', 'Demo Cam')).toBe(
      'AKASO Demo Cam',
    );
    expect(resolveAkasoCatalogName('UNKNOWN-SKU', 'AKASO Demo Cam')).toBe(
      'AKASO Demo Cam',
    );
  });
});
