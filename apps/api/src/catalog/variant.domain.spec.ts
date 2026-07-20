import {
  archivedVariantSku,
  conflictMessageForVariantUniqueViolation,
  normalizeVariantBarcode,
  normalizeVariantSku,
  variantUniqueViolationMessage,
} from './variant.domain';

describe('variant normalization', () => {
  it('trims SKU values', () => {
    expect(normalizeVariantSku('  APP-1  ')).toBe('APP-1');
  });

  it('stores blank barcodes as null', () => {
    expect(normalizeVariantBarcode('')).toBeNull();
    expect(normalizeVariantBarcode('   ')).toBeNull();
    expect(normalizeVariantBarcode(undefined)).toBeNull();
    expect(normalizeVariantBarcode('12345678')).toBe('12345678');
  });

  it('builds archived SKU placeholders', () => {
    expect(archivedVariantSku('550e8400-e29b-41d4-a716-446655440000')).toBe(
      'archived-550e8400-e29b-41d4-a716-446655440000',
    );
  });
});

describe('variant unique violation mapping', () => {
  it('maps sku index targets', () => {
    expect(variantUniqueViolationMessage(['sku'])).toBe('sku');
    expect(conflictMessageForVariantUniqueViolation('sku')).toBe(
      'SKU already exists',
    );
  });

  it('maps active barcode index targets', () => {
    expect(
      variantUniqueViolationMessage(['product_variants_active_barcode_key']),
    ).toBe('barcode');
    expect(conflictMessageForVariantUniqueViolation('barcode')).toBe(
      'Active barcode already exists',
    );
  });
});
