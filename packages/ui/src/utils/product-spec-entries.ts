import { COLOR_HEX_ATTRIBUTE_KEYS } from "./product-variant-attributes";

export type ProductRequiredSpecEntry = {
  label: string;
  value: string;
};

export type ProductSpecEntry = readonly [string, string];

function normalizeSpecLabel(label: string) {
  return label.trim().toLocaleLowerCase("az");
}

const BRAND_SPEC_LABELS = new Set(
  ["marka", "brand", "brend"].map((label) => label.toLocaleLowerCase("az")),
);

const MODEL_SPEC_LABELS = new Set(
  ["model"].map((label) => label.toLocaleLowerCase("az")),
);

function requiredSpecsIncludeLabel(
  requiredSpecs: ProductRequiredSpecEntry[],
  labels: Set<string>,
) {
  return requiredSpecs.some((spec) =>
    labels.has(normalizeSpecLabel(spec.label)),
  );
}

function isOperationalMemoryLabel(label: string) {
  const normalized = normalizeSpecLabel(label);
  return (
    normalized.includes("ram") ||
    (normalized.includes("operativ") && normalized.includes("yadd")) ||
    normalized.includes("operativ memory") ||
    normalized.includes("operational memory") ||
    (normalized.includes("müvəqqəti") && normalized.includes("yadd")) ||
    (normalized.includes("muveqqeti") && normalized.includes("yadd"))
  );
}

function isPermanentStorageLabel(label: string) {
  if (isOperationalMemoryLabel(label)) {
    return false;
  }

  const normalized = normalizeSpecLabel(label);
  return (
    normalized.includes("daimi yadd") ||
    normalized.includes("ssd") ||
    normalized.includes("storage") ||
    normalized.includes("permanent storage") ||
    normalized.includes("daxili yadd") ||
    (normalized.includes("yadd") &&
      !normalized.includes("operativ") &&
      !normalized.includes("müvəqqəti") &&
      !normalized.includes("muveqqeti"))
  );
}

function applyVariantAttributeOverlay(
  entries: ProductSpecEntry[],
  attributes: Record<string, string>,
) {
  const ram = attributes.RAM?.trim();
  const storage = attributes.Yaddaş?.trim();

  for (let index = 0; index < entries.length; index += 1) {
    const [label] = entries[index];
    if (ram !== undefined && ram !== "" && isOperationalMemoryLabel(label)) {
      entries[index] = [label, ram];
    } else if (
      storage !== undefined &&
      storage !== "" &&
      isPermanentStorageLabel(label)
    ) {
      entries[index] = [label, storage];
    }
  }
}

export function buildProductSpecEntries(input: {
  sku?: string;
  brandName?: string;
  modelName?: string;
  requiredSpecs?: ProductRequiredSpecEntry[];
  variantAttributes?: Record<string, string>;
}): ProductSpecEntry[] {
  const entries: ProductSpecEntry[] = [];

  if (input.sku !== undefined && input.sku.trim() !== "") {
    entries.push(["SKU", input.sku.trim()]);
  }

  const requiredSpecs = input.requiredSpecs ?? [];

  const brandName = input.brandName?.trim() ?? "";
  if (
    brandName !== "" &&
    !requiredSpecsIncludeLabel(requiredSpecs, BRAND_SPEC_LABELS)
  ) {
    entries.push(["Marka", brandName]);
  }

  const modelName = input.modelName?.trim() ?? "";
  if (
    modelName !== "" &&
    !requiredSpecsIncludeLabel(requiredSpecs, MODEL_SPEC_LABELS)
  ) {
    entries.push(["Model", modelName]);
  }
  if (requiredSpecs.length > 0) {
    for (const spec of requiredSpecs) {
      const label = spec.label.trim();
      const value = spec.value.trim();
      if (label === "" || value === "") {
        continue;
      }
      if (
        COLOR_HEX_ATTRIBUTE_KEYS.some(
          (hexLabel) =>
            normalizeSpecLabel(hexLabel) === normalizeSpecLabel(label),
        )
      ) {
        continue;
      }
      entries.push([label, value]);
    }

    if (input.variantAttributes !== undefined) {
      applyVariantAttributeOverlay(entries, input.variantAttributes);
    }
  } else if (input.variantAttributes !== undefined) {
    for (const [key, value] of Object.entries(input.variantAttributes)) {
      const trimmed = value.trim();
      if (trimmed !== "") {
        entries.push([key, trimmed]);
      }
    }
  }

  return entries;
}
