import {
  findStorageAttribute,
  type VariantAttributeInput,
  variantMatchesColor,
} from "./product-variant-attributes";

export type ProductStorageOption = {
  value: string;
  label: string;
  available: number;
};

export type VariantStorageInput = VariantAttributeInput;

function normalizeStorageValue(value: string): string {
  return value.trim().toLocaleLowerCase("az");
}

export function extractProductStorageOptions(
  variants: VariantStorageInput[],
  constraints?: { colorValue?: string | null },
): ProductStorageOption[] {
  const filteredVariants = constraints?.colorValue
    ? variants.filter((variant) =>
        variantMatchesColor(variant.attributes, constraints.colorValue!),
      )
    : variants;

  const storageByValue = new Map<string, ProductStorageOption>();

  for (const variant of filteredVariants) {
    const label = findStorageAttribute(variant.attributes);
    if (!label) {
      continue;
    }

    const value = normalizeStorageValue(label);
    const existing = storageByValue.get(value);

    if (existing) {
      existing.available = Math.max(existing.available, variant.available);
      continue;
    }

    storageByValue.set(value, {
      value,
      label,
      available: variant.available,
    });
  }

  const options = [...storageByValue.values()];
  if (options.length < 2) {
    return [];
  }

  return options;
}
