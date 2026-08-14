import { catalogSearchMatches, tokenizeCatalogSearchQuery } from '../storefront/catalog-search.domain';

export type InventorySnapshot = {
  onHand: number;
  reserved: number;
};

export type InventoryBalanceSearchableRow = {
  sku: string;
  variantName: string;
  barcode: string | null;
  productName: string;
  brandName: string | null;
};

export function inventoryBalanceSearchTokens(query: string): string[] {
  return tokenizeCatalogSearchQuery(query);
}

export function inventoryBalanceSearchMatches(
  query: string,
  row: InventoryBalanceSearchableRow,
): boolean {
  return catalogSearchMatches(query, {
    sku: row.sku,
    variantName: row.variantName,
    barcode: row.barcode,
    productName: row.productName,
    brandName: row.brandName,
    colorName: null,
  });
}

export function applyOnHandDelta(
  current: InventorySnapshot,
  delta: number,
): InventorySnapshot {
  if (!Number.isSafeInteger(delta) || delta === 0) {
    throw new Error('Inventory delta must be a non-zero safe integer');
  }
  const onHand = current.onHand + delta;
  if (
    !Number.isSafeInteger(onHand) ||
    current.reserved < 0 ||
    onHand < 0 ||
    onHand - current.reserved < 0
  ) {
    throw new Error('Negative available stock is forbidden');
  }
  return { onHand, reserved: current.reserved };
}
