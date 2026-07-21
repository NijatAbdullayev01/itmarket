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
  return query
    .trim()
    .split(/\s+/u)
    .filter((part) => part.length > 0);
}

function normalizeInventoryBalanceSearchPart(value: string) {
  return value.trim().toLocaleLowerCase("az");
}

export function inventoryBalanceSearchMatches(
  query: string,
  row: InventoryBalanceSearchableRow,
): boolean {
  const tokens = inventoryBalanceSearchTokens(query);
  if (tokens.length === 0) {
    return true;
  }

  const haystacks = [
    row.sku,
    row.variantName,
    row.barcode ?? "",
    row.productName,
    row.brandName ?? "",
  ].map(normalizeInventoryBalanceSearchPart);

  return tokens.every((token) => {
    const normalizedToken = normalizeInventoryBalanceSearchPart(token);
    return haystacks.some((haystack) => haystack.includes(normalizedToken));
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
