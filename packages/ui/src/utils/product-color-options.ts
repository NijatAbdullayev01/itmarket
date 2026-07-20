import {
  findColorAttribute,
  resolveColorHex,
  variantAttributesForSelection,
  variantMatchesRam,
  variantMatchesStorage,
  type VariantAttributeInput,
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
  constraints?: {
    storageValue?: string | null;
    ramValue?: string | null;
  },
): ProductColorOption[] {
  const colorByValue = new Map<string, ProductColorOption>();

  for (const variant of variants) {
    const attributes = variantAttributesForSelection(variant);
    const label = findColorAttribute(attributes);
    if (!label) {
      continue;
    }

    const value = normalizeColorValue(label);
    const matchesConstraints =
      (!constraints?.storageValue ||
        variantMatchesStorage(
          variant.attributes,
          constraints.storageValue,
          variant.name,
        )) &&
      (!constraints?.ramValue ||
        variantMatchesRam(variant.attributes, constraints.ramValue, variant.name));

    const hex = resolveColorHex(label, attributes);
    const existing = colorByValue.get(value);

    if (existing === undefined) {
      colorByValue.set(value, {
        value,
        label,
        hex,
        available: matchesConstraints ? variant.available : 0,
      });
      continue;
    }

    if (matchesConstraints) {
      existing.available = Math.max(existing.available, variant.available);
    }
    if (!existing.hex && hex) {
      existing.hex = hex;
    }
  }

  return [...colorByValue.values()];
}
