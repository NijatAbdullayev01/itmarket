import {
  findRamAttribute,
  normalizeRamOptionValue,
  variantAttributesForSelection,
  variantMatchesColor,
  variantMatchesStorage,
  type VariantAttributeInput,
} from "./product-variant-attributes";

export type ProductRamOption = {
  value: string;
  label: string;
  available: number;
};

export type VariantRamInput = VariantAttributeInput;

export function extractProductRamOptions(
  variants: VariantRamInput[],
  constraints?: {
    colorValue?: string | null;
    storageValue?: string | null;
  },
): ProductRamOption[] {
  const ramByValue = new Map<string, ProductRamOption>();

  for (const variant of variants) {
    const label = findRamAttribute(variantAttributesForSelection(variant));
    if (!label) {
      continue;
    }

    const value = normalizeRamOptionValue(label);
    const matchesConstraints =
      (!constraints?.colorValue ||
        variantMatchesColor(
          variant.attributes,
          constraints.colorValue,
          variant.name,
        )) &&
      (!constraints?.storageValue ||
        variantMatchesStorage(
          variant.attributes,
          constraints.storageValue,
          variant.name,
        ));

    const existing = ramByValue.get(value);
    if (existing === undefined) {
      ramByValue.set(value, {
        value,
        label,
        available: matchesConstraints ? variant.available : 0,
      });
      continue;
    }

    if (matchesConstraints) {
      existing.available = Math.max(existing.available, variant.available);
    }
  }

  return [...ramByValue.values()];
}
