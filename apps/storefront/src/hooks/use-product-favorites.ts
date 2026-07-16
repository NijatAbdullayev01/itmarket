"use client";

import { useCallback, useEffect, useState } from "react";

import {
  isProductInFavorites,
  readFavoriteItems,
  toggleFavoriteItem,
  writeFavoriteItems,
  type FavoriteItem,
} from "@/lib/favorites";

const FAVORITES_CHANGED_EVENT = "itmarket:favorites-changed";

function dispatchFavoritesChanged() {
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
}

export function useProductFavorites() {
  const [items, setItems] = useState<FavoriteItem[]>([]);

  const syncFromStorage = useCallback(() => {
    setItems(readFavoriteItems());
  }, []);

  useEffect(() => {
    syncFromStorage();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === "itmarket_favorites") {
        syncFromStorage();
      }
    };

    const handleFavoritesChanged = () => {
      syncFromStorage();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(FAVORITES_CHANGED_EVENT, handleFavoritesChanged);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(FAVORITES_CHANGED_EVENT, handleFavoritesChanged);
    };
  }, [syncFromStorage]);

  const toggle = useCallback((product: FavoriteItem) => {
    const current = readFavoriteItems();
    const result = toggleFavoriteItem(product, current);
    writeFavoriteItems(result.items);
    setItems(result.items);
    dispatchFavoritesChanged();
    return result;
  }, []);

  const remove = useCallback((productId: string) => {
    const current = readFavoriteItems();
    const next = current.filter((item) => item.id !== productId);
    writeFavoriteItems(next);
    setItems(next);
    dispatchFavoritesChanged();
  }, []);

  const clear = useCallback(() => {
    writeFavoriteItems([]);
    setItems([]);
    dispatchFavoritesChanged();
  }, []);

  return {
    items,
    count: items.length,
    isInFavorites: (productId: string) => isProductInFavorites(productId, items),
    toggle,
    remove,
    clear,
  };
}
