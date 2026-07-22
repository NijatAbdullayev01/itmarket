import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  loadNewOrderHighlightIds,
  loadViewedNewOrderIds,
  markNewOrderViewedInStorage,
  mergeNewOrderHighlightIds,
  setOrderHighlightStorageForTests,
} from "./order-new-arrival-highlight";

const HIGHLIGHT_IDS_STORAGE_KEY = "bo-new-order-highlight-ids";
const VIEWED_IDS_STORAGE_KEY = "bo-viewed-new-order-ids";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

beforeEach(() => {
  setOrderHighlightStorageForTests(createMemoryStorage());
});

afterEach(() => {
  setOrderHighlightStorageForTests(null);
  const storage = createMemoryStorage();
  storage.removeItem(HIGHLIGHT_IDS_STORAGE_KEY);
  storage.removeItem(VIEWED_IDS_STORAGE_KEY);
});

describe("order-new-arrival-highlight storage", () => {
  it("persists highlight ids across reloads", () => {
    mergeNewOrderHighlightIds(new Set(), ["order-1", "order-2"]);

    expect(loadNewOrderHighlightIds()).toEqual(new Set(["order-1", "order-2"]));
  });

  it("does not re-highlight orders that were already viewed", () => {
    markNewOrderViewedInStorage("order-1");

    expect(
      mergeNewOrderHighlightIds(new Set(), ["order-1", "order-2"]),
    ).toEqual(new Set(["order-2"]));
  });

  it("removes a viewed order from persisted highlights", () => {
    mergeNewOrderHighlightIds(new Set(), ["order-1"]);
    markNewOrderViewedInStorage("order-1");

    expect(loadNewOrderHighlightIds()).toEqual(new Set());
    expect(loadViewedNewOrderIds()).toEqual(new Set(["order-1"]));
  });
});
