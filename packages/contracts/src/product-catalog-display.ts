export type BuildProductCatalogDisplayTitleInput = {
  brandName?: string | null;
  modelName: string;
  /** SKU variant rəngi (məs. kataloq siyahısı başlığı). */
  colorName?: string | null;
  /** Admin panel: brend seçilməyəndə modeldən əvvəl göstərilir. */
  missingBrandLabel?: string;
};

const COLOR_ATTRIBUTE_KEYS = [
  "Rəng",
  "rəng",
  "Color",
  "color",
  "Renk",
  "renk",
] as const;

function normalizeCatalogTitlePart(value: string) {
  return value.trim().toLocaleLowerCase("az");
}

function modelAlreadyIncludesBrand(brandName: string, modelName: string) {
  const brand = brandName.trim();
  const model = modelName.trim();
  if (brand === "" || model === "") {
    return false;
  }

  const normalizedBrand = normalizeCatalogTitlePart(brand);
  const normalizedModel = normalizeCatalogTitlePart(model);

  return (
    normalizedModel === normalizedBrand ||
    normalizedModel.startsWith(`${normalizedBrand} `)
  );
}

function titleAlreadyIncludesPart(title: string, part: string) {
  const trimmedPart = part.trim();
  if (trimmedPart === "") {
    return true;
  }

  const normalizedPart = normalizeCatalogTitlePart(trimmedPart);
  const normalizedTitle = normalizeCatalogTitlePart(title);

  return (
    normalizedTitle === normalizedPart ||
    normalizedTitle.endsWith(` ${normalizedPart}`)
  );
}

function parseVariantAttributes(value: unknown): Record<string, string> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const attributes: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string" && entry.trim() !== "") {
      attributes[key] = entry.trim();
    }
  }

  return attributes;
}

function normalizeAttributeKey(key: string): string {
  return key.trim().toLocaleLowerCase("az");
}

function isColorAttributeKey(key: string): boolean {
  const normalized = normalizeAttributeKey(key);
  return COLOR_ATTRIBUTE_KEYS.some(
    (entry) => normalizeAttributeKey(entry) === normalized,
  );
}

function findColorAttribute(
  attributes: Record<string, string>,
): string | null {
  for (const key of COLOR_ATTRIBUTE_KEYS) {
    const value = attributes[key];
    if (value?.trim() && isPlausibleColorLabel(value)) {
      return value.trim();
    }
  }

  for (const [key, value] of Object.entries(attributes)) {
    if (!value?.trim() || !isColorAttributeKey(key)) {
      continue;
    }
    if (!isPlausibleColorLabel(value)) {
      continue;
    }

    return value.trim();
  }

  return null;
}

function looksLikeStorageLabel(value: string): boolean {
  const normalized = value.trim().toLocaleLowerCase("az");
  return /\d\s*(gb|tb|mb|kb)\b/u.test(normalized);
}

/**
 * Auto variant names are `storage / RAM / meter / ports / PoE / speed` — never color.
 * Reject technical segments so networking specs are not shown as color in titles.
 */
export function looksLikeNonColorVariantSegment(value: string): boolean {
  const normalized = value.trim().toLocaleLowerCase("az");
  if (normalized === "") {
    return true;
  }

  if (looksLikeStorageLabel(normalized)) {
    return true;
  }

  if (
    /(?:megabit|gigabit|meagbit|kilobit)/u.test(normalized) ||
    (/\d/u.test(normalized) &&
      /(?:[kmgt]?bit(?:\/?s)?|bps|mbps|gbps|kbps|bandwidth)/u.test(normalized))
  ) {
    return true;
  }

  if (/\b\d+\s*port(?:s)?\b/u.test(normalized)) {
    return true;
  }
  if (/\b\d+\s*poe\b/u.test(normalized)) {
    return true;
  }

  if (/\b\d+(?:[.,]\d+)?\s*(?:metr|meter|metre)\b/u.test(normalized)) {
    return true;
  }
  if (/^\d+(?:[.,]\d+)?\s*m$/u.test(normalized)) {
    return true;
  }

  return false;
}

function isPlausibleColorLabel(value: string): boolean {
  const trimmed = value.trim();
  return trimmed !== "" && !looksLikeNonColorVariantSegment(trimmed);
}

function inferColorFromVariantName(variantName: string): string | null {
  const bulletMatch = variantName.match(/\s[·•]\s(.+)$/u);
  if (bulletMatch?.[1]) {
    const candidate = bulletMatch[1].trim();
    if (isPlausibleColorLabel(candidate)) {
      return candidate;
    }
  }

  const slashSegments = variantName.split("/").map((part) => part.trim());
  const colorFromSlash = slashSegments[2];
  if (colorFromSlash !== undefined && isPlausibleColorLabel(colorFromSlash)) {
    return colorFromSlash;
  }

  return null;
}

function resolveVariantColorName(
  attributes: unknown,
  variantName?: string | null,
): string | null {
  const parsed = parseVariantAttributes(attributes);
  const normalized = { ...parsed };

  if (
    !findColorAttribute(normalized) &&
    variantName !== null &&
    variantName !== undefined &&
    variantName.trim() !== ""
  ) {
    const inferredColor = inferColorFromVariantName(variantName);
    if (inferredColor !== null) {
      normalized.Rəng = inferredColor;
    }
  }

  return findColorAttribute(normalized);
}

/**
 * Kataloqda brend + model ardıcıllığı ilə vitrin/admin başlıq mətni.
 * Model adında brend artıq varsa (köhnə məlumat), təkrarlanmır.
 */
export function buildProductCatalogDisplayTitle(
  input: BuildProductCatalogDisplayTitleInput,
): string {
  const modelName = input.modelName.trim();
  const brandName = input.brandName?.trim() ?? "";
  const missingBrandLabel = input.missingBrandLabel?.trim() ?? "";

  let baseTitle: string;

  if (brandName === "") {
    if (modelName === "") {
      baseTitle = missingBrandLabel;
    } else if (missingBrandLabel !== "") {
      baseTitle = `${missingBrandLabel} ${modelName}`;
    } else {
      baseTitle = modelName;
    }
  } else if (modelName === "") {
    baseTitle = brandName;
  } else if (modelAlreadyIncludesBrand(brandName, modelName)) {
    baseTitle = modelName;
  } else {
    baseTitle = `${brandName} ${modelName}`;
  }

  const colorName = input.colorName?.trim() ?? "";
  if (colorName === "" || titleAlreadyIncludesPart(baseTitle, colorName)) {
    return baseTitle;
  }

  return `${baseTitle} ${colorName}`;
}

export type ProductCatalogDisplayTitleInput = {
  brandName?: string | null;
  modelName: string;
  variantName?: string | null;
  variantAttributes?: unknown;
  missingBrandLabel?: string;
  /** Default true. Telefon/planşet olmayan kateqoriyada rəngi başlığa qarışdırma. */
  includeVariantColor?: boolean;
};

/** Brend, model və variant rəngi ilə vahid kataloq başlığı. */
export function getProductCatalogDisplayTitle(
  input: ProductCatalogDisplayTitleInput,
): string {
  const includeVariantColor = input.includeVariantColor !== false;
  const titleInput: BuildProductCatalogDisplayTitleInput = {
    brandName: input.brandName ?? null,
    modelName: input.modelName,
    colorName: includeVariantColor
      ? resolveVariantColorName(input.variantAttributes, input.variantName)
      : null,
  };

  if (input.missingBrandLabel !== undefined) {
    titleInput.missingBrandLabel = input.missingBrandLabel;
  }

  return buildProductCatalogDisplayTitle(titleInput);
}
