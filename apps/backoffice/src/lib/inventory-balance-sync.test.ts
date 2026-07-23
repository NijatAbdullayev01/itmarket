import { describe, expect, it } from "vitest";

import {
  detectInventoryBalanceSyncChange,
  getInventoryAvailableQuantity,
  inventoryBalanceSyncFingerprint,
  type InventoryBalanceSyncState,
} from "./inventory-balance-sync";

describe("inventoryBalanceSyncFingerprint", () => {
  it("includes all balance sync fields", () => {
    const state: InventoryBalanceSyncState = {
      rowCount: 4,
      onHand: 10,
      reserved: 2,
      available: 8,
      latestUpdatedAt: "2026-07-23T10:00:00.000Z",
    };

    expect(inventoryBalanceSyncFingerprint(state)).toBe(
      "4:10:2:8:2026-07-23T10:00:00.000Z",
    );
  });
});

describe("detectInventoryBalanceSyncChange", () => {
  const baseline: InventoryBalanceSyncState = {
    rowCount: 2,
    onHand: 10,
    reserved: 0,
    available: 10,
    latestUpdatedAt: "2026-07-23T10:00:00.000Z",
  };

  it("does not signal change before baseline is established", () => {
    expect(
      detectInventoryBalanceSyncChange(null, baseline, false),
    ).toBe(false);
  });

  it("does not signal change when fingerprint is unchanged", () => {
    expect(
      detectInventoryBalanceSyncChange(baseline, baseline, true),
    ).toBe(false);
  });

  it("signals change when reserved stock increases after checkout", () => {
    expect(
      detectInventoryBalanceSyncChange(
        baseline,
        {
          ...baseline,
          reserved: 1,
          available: 9,
          latestUpdatedAt: "2026-07-23T10:00:05.000Z",
        },
        true,
      ),
    ).toBe(true);
  });

  it("signals change when onHand decreases after fulfillment", () => {
    expect(
      detectInventoryBalanceSyncChange(
        baseline,
        {
          ...baseline,
          onHand: 9,
          available: 9,
          latestUpdatedAt: "2026-07-23T10:00:10.000Z",
        },
        true,
      ),
    ).toBe(true);
  });
});

describe("getInventoryAvailableQuantity", () => {
  it("returns onHand minus reserved", () => {
    expect(getInventoryAvailableQuantity({ onHand: 5, reserved: 2 })).toBe(3);
  });

  it("never returns negative values", () => {
    expect(getInventoryAvailableQuantity({ onHand: 1, reserved: 4 })).toBe(0);
  });
});
