export type InventorySnapshot = {
  onHand: number;
  reserved: number;
};

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
