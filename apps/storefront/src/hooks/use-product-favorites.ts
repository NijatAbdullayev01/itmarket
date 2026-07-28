"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  FAVORITES_STORAGE_KEY,
  isVariantInFavorites,
  readFavoriteItems,
  toggleFavoriteItem,
  writeFavoriteItems,
  type FavoriteItem,
} from "@/lib/favorites";

const FAVORITES_CHANGED_EVENT = "itmarket:favorites-changed";

/** Stable empty snapshot for SSR and empty favorite lists. */
const EMPTY_FAVORITE_ITEMS: FavoriteItem[] = [];

let favoritesSnapshotCache: FavoriteItem[] = EMPTY_FAVORITE_ITEMS;
let favoritesSnapshotStorageKey: string | null = null;

function invalidateFavoritesSnapshotCache() {
  favoritesSnapshotStorageKey = null;
}

function dispatchFavoritesChanged() {
  invalidateFavoritesSnapshotCache();
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
}

function subscribeToFavoriteItems(onStoreChange: () => void) {
  const handleChange = () => {
    invalidateFavoritesSnapshotCache();
    onStoreChange();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === FAVORITES_STORAGE_KEY) {
      handleChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(FAVORITES_CHANGED_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(FAVORITES_CHANGED_EVENT, handleChange);
  };
}

function getFavoriteItemsSnapshot(): FavoriteItem[] {
  const storageKey = window.localStorage.getItem(FAVORITES_STORAGE_KEY) ?? "";

  if (storageKey === favoritesSnapshotStorageKey) {
    return favoritesSnapshotCache;
  }

  favoritesSnapshotStorageKey = storageKey;
  const items = readFavoriteItems();
  favoritesSnapshotCache =
    items.length === 0 ? EMPTY_FAVORITE_ITEMS : items;
  return favoritesSnapshotCache;
}

function getFavoriteItemsServerSnapshot(): FavoriteItem[] {
  return EMPTY_FAVORITE_ITEMS;
}

export function useProductFavorites() {
  const items = useSyncExternalStore(
    subscribeToFavoriteItems,
    getFavoriteItemsSnapshot,
    getFavoriteItemsServerSnapshot,
  );

  const toggle = useCallback((product: FavoriteItem) => {
    const current = readFavoriteItems();
    const result = toggleFavoriteItem(product, current);
    writeFavoriteItems(result.items);
    dispatchFavoritesChanged();
    return result;
  }, []);

  const remove = useCallback((variantId: string) => {
    const current = readFavoriteItems();
    const next = current.filter((item) => item.variantId !== variantId);
    writeFavoriteItems(next);
    dispatchFavoritesChanged();
  }, []);

  const clear = useCallback(() => {
    writeFavoriteItems([]);
    dispatchFavoritesChanged();
  }, []);

  return {
    items,
    count: items.length,
    isInFavorites: (variantId: string) => isVariantInFavorites(variantId, items),
    toggle,
    remove,
    clear,
  };
}
