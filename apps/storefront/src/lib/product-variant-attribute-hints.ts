import {
  getColorValue,
  getStorageValue,
  normalizeVariantAttributes,
} from "@itmarket/ui";

export function attributeHintsFromRequiredSpecs(
  requiredSpecs: { label: string; value: string }[] | undefined,
): Record<string, string> {
  if (requiredSpecs === undefined || requiredSpecs.length === 0) {
    return {};
  }

  const raw: Record<string, string> = {};
  for (const spec of requiredSpecs) {
    const label = spec.label.trim();
    const value = spec.value.trim();
    if (label === "" || value === "") {
      continue;
    }
    raw[label] = value;
  }

  return normalizeVariantAttributes(raw);
}

/** Fill missing color/storage on a SKU from product-level required specs. */
export function mergeVariantAttributeHints(
  attributes: Record<string, string>,
  hints: Record<string, string>,
): Record<string, string> {
  const next = { ...attributes };
  if (!getColorValue(next)) {
    const color = getColorValue(hints);
    if (color) {
      next.Rəng = hints.Rəng?.trim() || color;
      const colorHex =
        hints["Rəng kodu"]?.trim() ||
        hints.colorHex?.trim() ||
        hints.hex?.trim() ||
        "";
      if (colorHex !== "") {
        next["Rəng kodu"] = colorHex;
      }
    }
  }
  if (!getStorageValue(next)) {
    const storage = hints.Yaddaş?.trim() || getStorageValue(hints);
    if (storage) {
      next.Yaddaş = storage;
    }
  }
  return next;
}
