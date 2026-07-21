"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  COMPARE_STORAGE_KEY,
  isVariantInCompare,
  readCompareItems,
  toggleCompareItem,
  writeCompareItems,
  type CompareItem,
} from "@/lib/compare";

const COMPARE_CHANGED_EVENT = "itmarket:compare-changed";

/** Stable empty snapshot for SSR and empty compare lists. */
const EMPTY_COMPARE_ITEMS: CompareItem[] = [];

let compareSnapshotCache: CompareItem[] = EMPTY_COMPARE_ITEMS;
let compareSnapshotStorageKey: string | null = null;

function invalidateCompareSnapshotCache() {
  compareSnapshotStorageKey = null;
}

function dispatchCompareChanged() {
  invalidateCompareSnapshotCache();
  window.dispatchEvent(new CustomEvent(COMPARE_CHANGED_EVENT));
}

function subscribeToCompareItems(onStoreChange: () => void) {
  const handleChange = () => {
    invalidateCompareSnapshotCache();
    onStoreChange();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === COMPARE_STORAGE_KEY) {
      handleChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(COMPARE_CHANGED_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(COMPARE_CHANGED_EVENT, handleChange);
  };
}

function getCompareItemsSnapshot(): CompareItem[] {
  const storageKey = window.localStorage.getItem(COMPARE_STORAGE_KEY) ?? "";

  if (storageKey === compareSnapshotStorageKey) {
    return compareSnapshotCache;
  }

  compareSnapshotStorageKey = storageKey;
  const items = readCompareItems();
  compareSnapshotCache =
    items.length === 0 ? EMPTY_COMPARE_ITEMS : items;
  return compareSnapshotCache;
}

function getCompareItemsServerSnapshot(): CompareItem[] {
  return EMPTY_COMPARE_ITEMS;
}

export function useProductCompare() {
  const items = useSyncExternalStore(
    subscribeToCompareItems,
    getCompareItemsSnapshot,
    getCompareItemsServerSnapshot,
  );

  const toggle = useCallback((product: CompareItem) => {
    const current = readCompareItems();
    const result = toggleCompareItem(product, current);
    writeCompareItems(result.items);
    dispatchCompareChanged();
    return result;
  }, []);

  const remove = useCallback((variantId: string) => {
    const current = readCompareItems();
    const next = current.filter((item) => item.variantId !== variantId);
    writeCompareItems(next);
    dispatchCompareChanged();
  }, []);

  const clear = useCallback(() => {
    writeCompareItems([]);
    dispatchCompareChanged();
  }, []);

  return {
    items,
    count: items.length,
    isInCompare: (variantId: string) => isVariantInCompare(variantId, items),
    toggle,
    remove,
    clear,
  };
}
