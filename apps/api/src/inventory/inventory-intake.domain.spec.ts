import {
  buildEan13Barcode,
  buildIntakeProductSlug,
  buildIntakeVariantSku,
  catalogNamesMatch,
  computeEan13CheckDigit,
  slugifyCatalogLabel,
  withIntakeSkuSuffix,
} from './inventory-intake.domain';
import { normalizeOptionalIntakeBarcode } from './inventory-intake.catalog';

describe('inventory intake catalog helpers', () => {
  it('slugifies Azerbaijani labels', () => {
    expect(slugifyCatalogLabel('Bakı Telefon')).toBe('baki-telefon');
  });

  it('builds product slug from brand and model', () => {
    expect(buildIntakeProductSlug('Apple', 'iPhone 17 Pro')).toBe(
      'apple-iphone-17-pro',
    );
  });

  it('matches catalog names case-insensitively', () => {
    expect(catalogNamesMatch('Apple', 'apple')).toBe(true);
    expect(catalogNamesMatch('Apple', 'Samsung')).toBe(false);
  });

  it('builds a default intake SKU', () => {
    expect(buildIntakeVariantSku('Apple', 'iPhone 17 Pro')).toBe('APPLE-IPHO-STD');
  });

  it('appends numeric suffix for SKU collisions', () => {
    expect(withIntakeSkuSuffix('APPLE-IPHO-STD', 2)).toBe('APPLE-IPHO-STD-2');
  });

  it('builds valid EAN-13 check digits', () => {
    expect(computeEan13CheckDigit('400638133393')).toBe(1);
    expect(buildEan13Barcode('400638133393')).toBe('4006381333931');
  });

  it('normalizes optional intake barcode for validation', () => {
    expect(normalizeOptionalIntakeBarcode('')).toBeUndefined();
    expect(normalizeOptionalIntakeBarcode('   ')).toBeUndefined();
    expect(normalizeOptionalIntakeBarcode(undefined)).toBeUndefined();
    expect(normalizeOptionalIntakeBarcode('2901234567890')).toBe('2901234567890');
  });
});
