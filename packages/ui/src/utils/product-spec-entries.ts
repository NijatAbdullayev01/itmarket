import {
  COLOR_HEX_ATTRIBUTE_KEYS,
  findColorAttribute,
} from "./product-variant-attributes";

export type ProductRequiredSpecEntry = {
  label: string;
  value: string;
};

export type ProductSpecEntry = readonly [string, string];

function normalizeSpecLabel(label: string) {
  return label.trim().toLocaleLowerCase("az");
}

function isColorSpecLabel(label: string) {
  const normalized = normalizeSpecLabel(label);
  return (
    normalized === "rəng" ||
    normalized === "reng" ||
    normalized === "color" ||
    normalized === "renk"
  );
}

function isColorHexSpecLabel(label: string) {
  return COLOR_HEX_ATTRIBUTE_KEYS.some(
    (hexLabel) =>
      normalizeSpecLabel(hexLabel) === normalizeSpecLabel(label),
  );
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

function isPortCountLabel(label: string) {
  const normalized = normalizeSpecLabel(label);
  return (
    normalized === "port" ||
    normalized.includes("port say") ||
    normalized.includes("port count") ||
    normalized.includes("ports")
  );
}

function isPoeCountLabel(label: string) {
  const normalized = normalizeSpecLabel(label);
  return normalized !== "" && normalized.includes("poe");
}

function isTransferSpeedLabel(label: string) {
  const normalized = normalizeSpecLabel(label);
  return (
    normalized === "sürət" ||
    normalized === "surət" ||
    normalized.includes("speed") ||
    normalized.includes("bandwidth") ||
    (normalized.includes("ötürmə") && normalized.includes("sür")) ||
    (normalized.includes("oturme") && normalized.includes("sur"))
  );
}

function isMeterLabel(label: string) {
  const normalized = normalizeSpecLabel(label);
  return (
    normalized === "metr" ||
    normalized === "meter" ||
    normalized === "metre" ||
    normalized === "uzunluq" ||
    normalized === "length"
  );
}

function applyVariantAttributeOverlay(
  entries: ProductSpecEntry[],
  attributes: Record<string, string>,
  options: { includePhoneTabletVariantAttributes?: boolean } = {},
) {
  const includePhoneTabletVariantAttributes =
    options.includePhoneTabletVariantAttributes !== false;
  const color = includePhoneTabletVariantAttributes
    ? (findColorAttribute(attributes)?.trim() ?? "")
    : "";
  const ram = includePhoneTabletVariantAttributes
    ? attributes.RAM?.trim()
    : undefined;
  const storage = includePhoneTabletVariantAttributes
    ? attributes.Yaddaş?.trim()
    : undefined;
  const meter = attributes.Metr?.trim();
  const portCount = attributes["Port sayı"]?.trim();
  const poeCount = attributes["PoE sayı"]?.trim();
  const transferSpeed = attributes["Ötürmə sürəti"]?.trim();

  for (let index = 0; index < entries.length; index += 1) {
    const [label] = entries[index];
    if (color !== "" && isColorSpecLabel(label)) {
      entries[index] = [label, color];
    } else if (ram !== undefined && ram !== "" && isOperationalMemoryLabel(label)) {
      entries[index] = [label, ram];
    } else if (
      storage !== undefined &&
      storage !== "" &&
      isPermanentStorageLabel(label)
    ) {
      entries[index] = [label, storage];
    } else if (
      meter !== undefined &&
      meter !== "" &&
      isMeterLabel(label)
    ) {
      entries[index] = [label, meter];
    } else if (
      portCount !== undefined &&
      portCount !== "" &&
      isPortCountLabel(label)
    ) {
      entries[index] = [label, portCount];
    } else if (
      poeCount !== undefined &&
      poeCount !== "" &&
      isPoeCountLabel(label)
    ) {
      entries[index] = [label, poeCount];
    } else if (
      transferSpeed !== undefined &&
      transferSpeed !== "" &&
      isTransferSpeedLabel(label)
    ) {
      entries[index] = [label, transferSpeed];
    }
  }

  // Variant attributes are the source of truth for the selected SKU; append
  // when product-level requiredSpecs never had a filled matching row.
  if (
    color !== "" &&
    !entries.some(([label]) => isColorSpecLabel(label))
  ) {
    entries.push(["Rəng", color]);
  }
  if (
    storage !== undefined &&
    storage !== "" &&
    !entries.some(([label]) => isPermanentStorageLabel(label))
  ) {
    entries.push(["Daimi yaddaş", storage]);
  }
  if (
    ram !== undefined &&
    ram !== "" &&
    !entries.some(([label]) => isOperationalMemoryLabel(label))
  ) {
    entries.push(["Müvəqqəti yaddaş", ram]);
  }
  if (
    meter !== undefined &&
    meter !== "" &&
    !entries.some(([label]) => isMeterLabel(label))
  ) {
    entries.push(["Metr", meter]);
  }
  if (
    portCount !== undefined &&
    portCount !== "" &&
    !entries.some(([label]) => isPortCountLabel(label))
  ) {
    entries.push(["Port sayı", portCount]);
  }
  if (
    poeCount !== undefined &&
    poeCount !== "" &&
    !entries.some(([label]) => isPoeCountLabel(label))
  ) {
    entries.push(["PoE sayı", poeCount]);
  }
  if (
    transferSpeed !== undefined &&
    transferSpeed !== "" &&
    !entries.some(([label]) => isTransferSpeedLabel(label))
  ) {
    entries.push(["Ötürmə sürəti", transferSpeed]);
  }
}

function resolveRequiredSpecValue(
  label: string,
  value: string,
  attributes: Record<string, string> | undefined,
  options: { includePhoneTabletVariantAttributes?: boolean } = {},
): string {
  if (attributes === undefined) {
    return value;
  }
  const includePhoneTabletVariantAttributes =
    options.includePhoneTabletVariantAttributes !== false;
  if (isColorSpecLabel(label)) {
    if (!includePhoneTabletVariantAttributes) {
      return value;
    }
    return findColorAttribute(attributes)?.trim() || value;
  }
  if (isOperationalMemoryLabel(label)) {
    if (!includePhoneTabletVariantAttributes) {
      return value;
    }
    return attributes.RAM?.trim() || value;
  }
  if (isPermanentStorageLabel(label)) {
    if (!includePhoneTabletVariantAttributes) {
      return value;
    }
    return attributes.Yaddaş?.trim() || value;
  }
  if (isMeterLabel(label)) {
    return attributes.Metr?.trim() || value;
  }
  if (isPortCountLabel(label)) {
    return attributes["Port sayı"]?.trim() || value;
  }
  if (isPoeCountLabel(label)) {
    return attributes["PoE sayı"]?.trim() || value;
  }
  if (isTransferSpeedLabel(label)) {
    return attributes["Ötürmə sürəti"]?.trim() || value;
  }
  return value;
}

export function buildProductSpecEntries(input: {
  sku?: string;
  brandName?: string;
  modelName?: string;
  requiredSpecs?: ProductRequiredSpecEntry[];
  variantAttributes?: Record<string, string>;
  /**
   * Rəng / daimi / müvəqqəti yaddaş variant overlay yalnız telefon-planşet
   * kateqoriyasında. Default: true.
   */
  includePhoneTabletVariantAttributes?: boolean;
}): ProductSpecEntry[] {
  const entries: ProductSpecEntry[] = [];
  const includePhoneTabletVariantAttributes =
    input.includePhoneTabletVariantAttributes !== false;
  const attributeOptions = { includePhoneTabletVariantAttributes };

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
      if (label === "" || isColorHexSpecLabel(label)) {
        continue;
      }
      const value = resolveRequiredSpecValue(
        label,
        spec.value.trim(),
        input.variantAttributes,
        attributeOptions,
      );
      if (value === "") {
        continue;
      }
      entries.push([label, value]);
    }

    if (input.variantAttributes !== undefined) {
      applyVariantAttributeOverlay(
        entries,
        input.variantAttributes,
        attributeOptions,
      );
    }
  } else if (input.variantAttributes !== undefined) {
    for (const [key, value] of Object.entries(input.variantAttributes)) {
      const trimmed = value.trim();
      if (trimmed === "" || isColorHexSpecLabel(key)) {
        continue;
      }
      if (
        !includePhoneTabletVariantAttributes &&
        (isColorSpecLabel(key) ||
          key === "Yaddaş" ||
          key === "RAM" ||
          isPermanentStorageLabel(key) ||
          isOperationalMemoryLabel(key))
      ) {
        continue;
      }
      entries.push([key, trimmed]);
    }
  }

  return entries;
}
