import { supportsPhoneTabletVariantAttributes } from "./phone-tablet-variant-attributes.js";

export type CatalogRequiredSpecEntry = {
  label: string;
  value: string;
};

export type BuildProductCatalogDisplayTitleInput = {
  brandName?: string | null;
  modelName: string;
  /** SKU variant rəngi (məs. kataloq siyahısı başlığı). */
  colorName?: string | null;
  /** Manufacturer part number shown after the marketing name (HP P/N). */
  partNumber?: string | null;
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

const HP_PART_NUMBER_PATTERN = /^[A-Z0-9]{5,12}$/;

const HP_PART_NUMBER_SPEC_LABELS = new Set([
  "part number",
  "part nömrəsi",
  "part nomresi",
  "mpn",
]);

export function isHpCatalogBrand(
  brandName?: string | null,
  brandSlug?: string | null,
) {
  const slug = brandSlug?.trim().toLocaleLowerCase("az") ?? "";
  if (slug === "hp") {
    return true;
  }
  return brandName?.trim().toLocaleLowerCase("az") === "hp";
}

function titleAlreadyIncludesPartNumber(title: string, partNumber: string) {
  const trimmed = partNumber.trim();
  if (trimmed === "") {
    return true;
  }

  const normalizedTitle = normalizeCatalogTitlePart(title);
  const normalizedPn = normalizeCatalogTitlePart(trimmed);
  return (
    normalizedTitle.includes(`(${normalizedPn})`) ||
    titleAlreadyIncludesPart(title, trimmed)
  );
}

function partNumberFromHpSku(sku: string) {
  const segments = sku.trim().toUpperCase().split("-");
  if (
    segments[0] === "HP" &&
    segments[1] !== undefined &&
    HP_PART_NUMBER_PATTERN.test(segments[1])
  ) {
    return segments[1];
  }
  if (segments.length === 1 && HP_PART_NUMBER_PATTERN.test(segments[0]!)) {
    return segments[0]!;
  }
  return null;
}

/** HP P/N from requiredSpecs, else from auto SKU `HP-8X9C9EA`. */
export function resolveHpCatalogPartNumber(input: {
  brandName?: string | null;
  brandSlug?: string | null;
  requiredSpecs?: readonly CatalogRequiredSpecEntry[] | null;
  sku?: string | null;
}): string | null {
  if (!isHpCatalogBrand(input.brandName, input.brandSlug)) {
    return null;
  }

  for (const spec of input.requiredSpecs ?? []) {
    const label = spec.label.trim().toLocaleLowerCase("az");
    if (!HP_PART_NUMBER_SPEC_LABELS.has(label)) {
      continue;
    }
    const value = spec.value.trim().toUpperCase();
    if (HP_PART_NUMBER_PATTERN.test(value)) {
      return value;
    }
  }

  const sku = input.sku?.trim() ?? "";
  if (sku === "") {
    return null;
  }
  return partNumberFromHpSku(sku);
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
  if (colorName !== "" && !titleAlreadyIncludesPart(baseTitle, colorName)) {
    baseTitle = `${baseTitle} ${colorName}`;
  }

  const partNumber = input.partNumber?.trim() ?? "";
  if (
    partNumber === "" ||
    titleAlreadyIncludesPartNumber(baseTitle, partNumber)
  ) {
    return baseTitle;
  }

  return `${baseTitle} (${partNumber})`;
}

export type ProductCatalogDisplayTitleCategory = {
  slug?: string | null;
  name?: string | null;
  parentSlug?: string | null;
  parent?: { slug?: string | null } | null;
};

export type ProductCatalogDisplayTitleInput = {
  brandName?: string | null;
  brandSlug?: string | null;
  modelName: string;
  variantName?: string | null;
  variantAttributes?: unknown;
  missingBrandLabel?: string;
  /**
   * Explicit override. When omitted, rəng yalnız telefon/planşet
   * kateqoriyasında (və ya kateqoriya naməlum olanda) başlığa düşür.
   */
  includeVariantColor?: boolean;
  category?: ProductCatalogDisplayTitleCategory | null;
  requiredSpecs?: readonly CatalogRequiredSpecEntry[] | null;
  sku?: string | null;
  partNumber?: string | null;
};

/** Kart/siyahı başlığında variant rəngi göstərilsin? */
export function shouldIncludeVariantColorInDisplayTitle(
  category?: ProductCatalogDisplayTitleCategory | null,
): boolean {
  const slug = category?.slug?.trim() ?? "";
  if (slug === "") {
    return true;
  }

  return supportsPhoneTabletVariantAttributes({
    slug,
    name: category?.name,
    parentSlug: category?.parentSlug ?? category?.parent?.slug ?? null,
  });
}

function resolveIncludeVariantColor(
  input: ProductCatalogDisplayTitleInput,
): boolean {
  if (input.includeVariantColor !== undefined) {
    return input.includeVariantColor;
  }
  return shouldIncludeVariantColorInDisplayTitle(input.category);
}

/** Brend, model və variant rəngi ilə vahid kataloq başlığı. */
export function getProductCatalogDisplayTitle(
  input: ProductCatalogDisplayTitleInput,
): string {
  const includeVariantColor = resolveIncludeVariantColor(input);
  const titleInput: BuildProductCatalogDisplayTitleInput = {
    brandName: input.brandName ?? null,
    modelName: input.modelName,
    colorName: includeVariantColor
      ? resolveVariantColorName(input.variantAttributes, input.variantName)
      : null,
    partNumber:
      input.partNumber?.trim() ||
      resolveHpCatalogPartNumber({
        brandName: input.brandName,
        brandSlug: input.brandSlug,
        requiredSpecs: input.requiredSpecs,
        sku: input.sku,
      }),
  };

  if (input.missingBrandLabel !== undefined) {
    titleInput.missingBrandLabel = input.missingBrandLabel;
  }

  return buildProductCatalogDisplayTitle(titleInput);
}
