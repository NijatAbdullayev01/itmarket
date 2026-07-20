import {
  findStorageAttribute,
  normalizeStorageOptionValue,
  variantAttributesForSelection,
  variantMatchesColor,
  variantMatchesRam,
  type VariantAttributeInput,
} from "./product-variant-attributes";

export type ProductStorageOption = {
  value: string;
  label: string;
  available: number;
};

export type VariantStorageInput = VariantAttributeInput;

export function extractProductStorageOptions(
  variants: VariantStorageInput[],
  constraints?: {
    colorValue?: string | null;
    ramValue?: string | null;
  },
): ProductStorageOption[] {
  const storageByValue = new Map<string, ProductStorageOption>();

  for (const variant of variants) {
    const label = findStorageAttribute(variantAttributesForSelection(variant));
    if (!label) {
      continue;
    }

    const value = normalizeStorageOptionValue(label);
    const matchesConstraints =
      (!constraints?.colorValue ||
        variantMatchesColor(
          variant.attributes,
          constraints.colorValue,
          variant.name,
        )) &&
      (!constraints?.ramValue ||
        variantMatchesRam(variant.attributes, constraints.ramValue, variant.name));

    const existing = storageByValue.get(value);
    if (existing === undefined) {
      storageByValue.set(value, {
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

  return [...storageByValue.values()];
}
