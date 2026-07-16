"use client";

import { useCallback, useEffect, useState } from "react";

import {
  isProductInCompare,
  readCompareItems,
  toggleCompareItem,
  writeCompareItems,
  type CompareItem,
} from "@/lib/compare";

const COMPARE_CHANGED_EVENT = "itmarket:compare-changed";

function dispatchCompareChanged() {
  window.dispatchEvent(new CustomEvent(COMPARE_CHANGED_EVENT));
}

export function useProductCompare() {
  const [items, setItems] = useState<CompareItem[]>([]);

  const syncFromStorage = useCallback(() => {
    setItems(readCompareItems());
  }, []);

  useEffect(() => {
    syncFromStorage();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === "itmarket_compare") {
        syncFromStorage();
      }
    };

    const handleCompareChanged = () => {
      syncFromStorage();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(COMPARE_CHANGED_EVENT, handleCompareChanged);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(COMPARE_CHANGED_EVENT, handleCompareChanged);
    };
  }, [syncFromStorage]);

  const toggle = useCallback((product: CompareItem) => {
    const current = readCompareItems();
    const result = toggleCompareItem(product, current);
    writeCompareItems(result.items);
    setItems(result.items);
    dispatchCompareChanged();
    return result;
  }, []);

  const remove = useCallback((productId: string) => {
    const current = readCompareItems();
    const next = current.filter((item) => item.id !== productId);
    writeCompareItems(next);
    setItems(next);
    dispatchCompareChanged();
  }, []);

  const clear = useCallback(() => {
    writeCompareItems([]);
    setItems([]);
    dispatchCompareChanged();
  }, []);

  return {
    items,
    count: items.length,
    isInCompare: (productId: string) => isProductInCompare(productId, items),
    toggle,
    remove,
    clear,
  };
}
