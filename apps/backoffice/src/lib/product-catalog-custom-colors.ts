import { catalogColorLabelEquals } from "./product-catalog-colors";

const STORAGE_KEY = "itmarket.backoffice.customCatalogColors";

export type CustomCatalogColor = {
  label: string;
  hex: string;
};

function getStorage(): Storage | null {
  if (typeof globalThis.localStorage === "undefined") {
    return null;
  }

  return globalThis.localStorage;
}

function canUseStorage() {
  return getStorage() !== null;
}

function isValidHexColor(value: string) {
  return /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(value.trim());
}

function normalizeStoredColor(entry: unknown): CustomCatalogColor | null {
  if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }

  const label = (entry as { label?: unknown }).label;
  const hex = (entry as { hex?: unknown }).hex;
  if (typeof label !== "string" || typeof hex !== "string") {
    return null;
  }

  const trimmedLabel = label.trim();
  const trimmedHex = hex.trim();
  if (trimmedLabel === "" || !isValidHexColor(trimmedHex)) {
    return null;
  }

  return { label: trimmedLabel, hex: trimmedHex };
}

export function loadCustomCatalogColors(): CustomCatalogColor[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = getStorage()?.getItem(STORAGE_KEY);
    if (raw === null || raw.trim() === "") {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const colors: CustomCatalogColor[] = [];
    for (const entry of parsed) {
      const normalized = normalizeStoredColor(entry);
      if (normalized === null) {
        continue;
      }
      if (
        colors.some((existing) =>
          catalogColorLabelEquals(existing.label, normalized.label),
        )
      ) {
        continue;
      }
      colors.push(normalized);
    }

    return colors;
  } catch {
    return [];
  }
}

function writeCustomCatalogColors(colors: CustomCatalogColor[]) {
  if (!canUseStorage()) {
    return;
  }

  getStorage()?.setItem(STORAGE_KEY, JSON.stringify(colors));
}

export function upsertCustomCatalogColor(label: string, hex: string) {
  const trimmedLabel = label.trim();
  const trimmedHex = hex.trim();
  if (trimmedLabel === "" || !isValidHexColor(trimmedHex)) {
    return;
  }

  const nextEntry: CustomCatalogColor = {
    label: trimmedLabel,
    hex: trimmedHex,
  };
  const colors = loadCustomCatalogColors();
  const withoutDuplicate = colors.filter(
    (entry) => !catalogColorLabelEquals(entry.label, trimmedLabel),
  );
  writeCustomCatalogColors([nextEntry, ...withoutDuplicate]);
}

export function removeCustomCatalogColor(label: string) {
  const trimmedLabel = label.trim();
  if (trimmedLabel === "") {
    return;
  }

  writeCustomCatalogColors(
    loadCustomCatalogColors().filter(
      (entry) => !catalogColorLabelEquals(entry.label, trimmedLabel),
    ),
  );
}

export function customCatalogColorsToSessionState(colors: CustomCatalogColor[]): {
  labels: string[];
  hexByLabel: Record<string, string>;
} {
  const labels: string[] = [];
  const hexByLabel: Record<string, string> = {};

  for (const color of colors) {
    if (labels.some((label) => catalogColorLabelEquals(label, color.label))) {
      continue;
    }
    labels.push(color.label);
    hexByLabel[color.label] = color.hex;
  }

  return { labels, hexByLabel };
}
