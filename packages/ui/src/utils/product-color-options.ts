import {
  findColorAttribute,
  resolveColorHex,
  type VariantAttributeInput,
  variantMatchesStorage,
} from "./product-variant-attributes";

export type ProductColorOption = {
  value: string;
  label: string;
  hex: string | null;
  available: number;
};

export type VariantColorInput = VariantAttributeInput;

function normalizeColorValue(value: string): string {
  return value.trim().toLocaleLowerCase("az");
}

export function extractProductColorOptions(
  variants: VariantColorInput[],
  constraints?: { storageValue?: string | null },
): ProductColorOption[] {
  const filteredVariants = constraints?.storageValue
    ? variants.filter((variant) =>
        variantMatchesStorage(variant.attributes, constraints.storageValue!),
      )
    : variants;

  const colorByValue = new Map<string, ProductColorOption>();

  for (const variant of filteredVariants) {
    const label = findColorAttribute(variant.attributes);
    if (!label) {
      continue;
    }

    const value = normalizeColorValue(label);
    const existing = colorByValue.get(value);
    const hex = resolveColorHex(label, variant.attributes);

    if (existing) {
      existing.available = Math.max(existing.available, variant.available);
      if (!existing.hex && hex) {
        existing.hex = hex;
      }
      continue;
    }

    colorByValue.set(value, {
      value,
      label,
      hex,
      available: variant.available,
    });
  }

  const options = [...colorByValue.values()];
  if (options.length < 2) {
    return [];
  }

  return options;
}
