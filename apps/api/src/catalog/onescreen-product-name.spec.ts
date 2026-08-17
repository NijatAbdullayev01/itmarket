import {
  listOneScreenCatalogNameSkus,
  normalizeOneScreenSku,
  resolveOneScreenCatalogName,
} from './onescreen-product-name';

export const ONESCREEN_EXCEL_RAW_SKUS = [
  'Panel55',
  'T7-65',
  'Panel75',
  'T7-75',
  'OS-T7-75',
  'Panel86',
  'T7-86',
  'OS-T7-86',
  'Core65',
  'Core75',
  'Core86',
  'OneScreen-i5-L7',
  'OneScreen-i7-L7',
  'OS-Mobile-Cart',
  'OneScreenCast',
  'OneScreenWebCam',
] as const;

describe('onescreen-product-name', () => {
  it('normalizes Excel part numbers into unique SKUs', () => {
    expect(normalizeOneScreenSku(' panel55 ')).toBe('PANEL55');
    expect(normalizeOneScreenSku('T7-65')).toBe('T7-65');
    expect(normalizeOneScreenSku('OneScreen-i5-L7')).toBe('ONESCREEN-I5-L7');
    expect(normalizeOneScreenSku('OneScreenCast')).toBe('ONESCREENCAST');
    expect(normalizeOneScreenSku('OS-Mobile-Cart')).toBe('OS-MOBILE-CART');

    const skus = ONESCREEN_EXCEL_RAW_SKUS.map(normalizeOneScreenSku);
    expect(new Set(skus).size).toBe(skus.length);
    expect(skus).toEqual(expect.arrayContaining(listOneScreenCatalogNameSkus()));
  });

  it('covers every onescreen.xlsx SKU with a catalog title', () => {
    expect(listOneScreenCatalogNameSkus()).toEqual(
      ONESCREEN_EXCEL_RAW_SKUS.map(normalizeOneScreenSku),
    );
    expect(listOneScreenCatalogNameSkus()).toHaveLength(16);
  });

  it('keeps series and size without collapsing supplier SKUs', () => {
    expect(resolveOneScreenCatalogName('Panel55', 'TL7 55')).toBe(
      'OneScreen TL7 55" interaktiv lövhə',
    );
    expect(resolveOneScreenCatalogName('T7-75', 'T7 75')).toBe(
      'OneScreen T7 75" interaktiv lövhə',
    );
    expect(resolveOneScreenCatalogName('Panel75', 'T7 75')).toBe(
      'OneScreen T7 75" interaktiv lövhə (Panel75)',
    );
    expect(resolveOneScreenCatalogName('OS-T7-75', 'T7 75')).toBe(
      'OneScreen T7 75" interaktiv lövhə (OS-T7-75)',
    );
    expect(
      resolveOneScreenCatalogName('OneScreen-i5-L7', 'OPS i5'),
    ).toBe('OneScreen OPS PC i5 16GB/256GB (T7)');
    expect(resolveOneScreenCatalogName('OneScreenCast', 'Cast')).toBe(
      'OneScreen Cast simsiz ekran paylaşımı',
    );
  });

  it('prefixes OneScreen on unknown titles', () => {
    expect(resolveOneScreenCatalogName('UNKNOWN-1', 'Demo Panel')).toBe(
      'OneScreen Demo Panel',
    );
    expect(
      resolveOneScreenCatalogName('UNKNOWN-1', 'OneScreen Demo Panel'),
    ).toBe('OneScreen Demo Panel');
  });
});
