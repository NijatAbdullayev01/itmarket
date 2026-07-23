export type InventoryBalanceSyncState = {
  rowCount: number;
  onHand: number;
  reserved: number;
  available: number;
  latestUpdatedAt: string | null;
};

export const INVENTORY_BALANCE_SYNC_POLL_INTERVAL_MS = 15_000;

export function inventoryBalanceSyncFingerprint(
  state: InventoryBalanceSyncState,
): string {
  return [
    state.rowCount,
    state.onHand,
    state.reserved,
    state.available,
    state.latestUpdatedAt ?? "",
  ].join(":");
}

export function detectInventoryBalanceSyncChange(
  previous: InventoryBalanceSyncState | null,
  current: InventoryBalanceSyncState,
  baselineEstablished: boolean,
): boolean {
  if (!baselineEstablished || previous === null) {
    return false;
  }

  return (
    inventoryBalanceSyncFingerprint(previous) !==
    inventoryBalanceSyncFingerprint(current)
  );
}

export function getInventoryAvailableQuantity(input: {
  onHand: number;
  reserved: number;
}): number {
  return Math.max(0, input.onHand - input.reserved);
}
