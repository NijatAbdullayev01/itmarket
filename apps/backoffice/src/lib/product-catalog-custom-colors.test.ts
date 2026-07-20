import { afterEach, describe, expect, it, vi } from "vitest";

import {
  loadCustomCatalogColors,
  removeCustomCatalogColor,
  upsertCustomCatalogColor,
} from "./product-catalog-custom-colors";

const STORAGE_KEY = "itmarket.backoffice.customCatalogColors";

function createStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

describe("product-catalog-custom-colors", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("upserts and loads custom colors", () => {
    vi.stubGlobal("localStorage", createStorage());

    upsertCustomCatalogColor("Açıq mavi", "#5b9bd5");
    upsertCustomCatalogColor("  açıq mavi  ", "#112233");

    expect(loadCustomCatalogColors()).toEqual([
      { label: "açıq mavi", hex: "#112233" },
    ]);
  });

  it("removes a stored custom color", () => {
    vi.stubGlobal("localStorage", createStorage());
    upsertCustomCatalogColor("Göy", "#2563eb");
    removeCustomCatalogColor("göy");

    expect(loadCustomCatalogColors()).toEqual([]);
    expect(globalThis.localStorage.getItem(STORAGE_KEY)).toBe("[]");
  });
});
