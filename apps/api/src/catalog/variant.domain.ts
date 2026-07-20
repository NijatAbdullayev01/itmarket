export function normalizeVariantSku(sku: string): string {
  return sku.trim();
}

export function normalizeVariantBarcode(
  barcode: string | undefined | null,
): string | null {
  if (barcode === undefined || barcode === null) {
    return null;
  }
  const trimmed = barcode.trim();
  return trimmed === '' ? null : trimmed;
}

/** Frees catalog SKU uniqueness after archive while keeping the variant row for history. */
export function archivedVariantSku(variantId: string): string {
  return `archived-${variantId}`;
}

export function variantUniqueViolationMessage(
  target: unknown,
): 'sku' | 'barcode' | 'unknown' {
  if (!Array.isArray(target)) {
    return 'unknown';
  }
  const fields = target.map((entry) => String(entry).toLowerCase());
  if (fields.some((field) => field.includes('sku'))) {
    return 'sku';
  }
  if (fields.some((field) => field.includes('barcode'))) {
    return 'barcode';
  }
  return 'unknown';
}

export function conflictMessageForVariantUniqueViolation(
  kind: 'sku' | 'barcode' | 'unknown',
): string {
  switch (kind) {
    case 'sku':
      return 'SKU already exists';
    case 'barcode':
      return 'Active barcode already exists';
    default:
      return 'SKU or active barcode already exists';
  }
}
