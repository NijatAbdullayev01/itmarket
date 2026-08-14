import {
  SKU_PATTERN,
  buildProductSlugFromCatalogFields,
  buildVariantSkuFromCatalogFields,
} from "@itmarket/contracts";

import type { ProductRequiredSpecEntry } from "./product-required-specs";
import {
  createEmptyRequiredSpecRow,
  isColorHexSpecLabel,
  isColorSpecLabel,
  isMeterSpecLabel,
  isPoeCountSpecLabel,
  isPortCountSpecLabel,
  isTemporaryMemorySpecLabel,
  isTransferSpeedSpecLabel,
  POE_COUNT_SPEC_LABEL,
  PORT_COUNT_SPEC_LABEL,
  TEMPORARY_MEMORY_SPEC_LABEL,
  TRANSFER_SPEED_SPEC_LABEL,
  type ProductRequiredSpecRow,
} from "./product-required-specs";
import { normalizeProductNameQuery } from "./product-name-search";

export { SKU_PATTERN, buildProductSlugFromCatalogFields, buildVariantSkuFromCatalogFields };

export type CategoryRef = {
  id: string;
  parentId?: string | null;
};

export type ExistingCatalogProduct = {
  id: string;
  name: string;
  slug: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  brand: { id: string; name: string } | null;
  categoryId: string;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  requiredSpecs: ProductRequiredSpecEntry[];
  variants?: { id?: string; sku: string; barcode?: string | null }[];
};

export function findProductByVariantBarcode<
  T extends ExistingCatalogProduct & {
    variants?: { id: string; barcode: string | null }[];
  },
>(products: T[], rawBarcode: string): { product: T; variantId: string } | undefined {
  const normalized = rawBarcode.trim().toLowerCase();
  if (normalized === "") {
    return undefined;
  }

  for (const product of products) {
    for (const variant of product.variants ?? []) {
      if (variant.id === undefined) {
        continue;
      }
      const barcode = variant.barcode?.trim().toLowerCase();
      if (barcode !== undefined && barcode !== "" && barcode === normalized) {
        return { product, variantId: variant.id };
      }
    }
  }

  return undefined;
}

export type ProductFormSnapshot = {
  name: string;
  slug: string;
  brandId: string;
  categoryId: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  requiredSpecs: ProductRequiredSpecEntry[];
};

export function parseProductRequiredSpecs(value: unknown): ProductRequiredSpecEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const entries: ProductRequiredSpecEntry[] = [];
  for (const item of value) {
    if (item === null || typeof item !== "object") {
      continue;
    }

    const record = item as Record<string, unknown>;
    const label = typeof record.label === "string" ? record.label.trim() : "";
    const specValue =
      typeof record.value === "string" ? record.value.trim() : "";

    if (label === "" && specValue === "") {
      continue;
    }

    if (label === "" || specValue === "") {
      continue;
    }

    entries.push({ label, value: specValue });
  }

  return entries;
}

export function requiredSpecEntriesToRows(
  entries: ProductRequiredSpecEntry[],
): ProductRequiredSpecRow[] {
  if (entries.length === 0) {
    return [];
  }

  const colorHexEntry = entries.find((entry) => isColorHexSpecLabel(entry.label));
  const persistedColorHex = colorHexEntry?.value.trim() ?? "";

  return entries
    .filter((entry) => !isColorHexSpecLabel(entry.label))
    .map((entry) => ({
      id: crypto.randomUUID(),
      label: entry.label,
      value: entry.value,
      ...(isColorSpecLabel(entry.label) && persistedColorHex !== ""
        ? { colorHex: persistedColorHex }
        : {}),
    }));
}

export function resolveCategorySelection(
  categoryId: string,
  categories: CategoryRef[],
): { parentCategoryId: string; subcategoryId: string } {
  const category = categories.find((entry) => entry.id === categoryId);
  if (category === undefined) {
    return { parentCategoryId: "", subcategoryId: "" };
  }

  if (category.parentId == null) {
    return { parentCategoryId: category.id, subcategoryId: "" };
  }

  return {
    parentCategoryId: category.parentId,
    subcategoryId: category.id,
  };
}

function normalizeSpecLabel(label: string) {
  return label
    .trim()
    .toLocaleLowerCase("az")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ");
}

export function isMemoryStorageSpecLabel(label: string) {
  const normalized = normalizeSpecLabel(label);
  if (normalized === "") {
    return false;
  }

  const operationalPatterns = [
    "ram",
    "operativ yaddas",
    "operativ yaddaş",
    "operativ memory",
    "operational memory",
    "müvəqqəti yaddas",
    "müvəqqəti yaddaş",
    "muveqqeti yaddas",
  ];
  const permanentPatterns = [
    "yaddas",
    "yaddaş",
    "daimi yaddas",
    "daimi yaddaş",
    "ssd",
    "storage",
    "permanent storage",
    "daxili yaddas",
    "daxili yaddaş",
  ];

  if (operationalPatterns.some((pattern) => normalized.includes(pattern))) {
    return true;
  }

  if (permanentPatterns.some((pattern) => normalized.includes(pattern))) {
    return true;
  }

  return false;
}

function specMap(entries: ProductRequiredSpecEntry[]) {
  const map = new Map<string, string>();
  for (const entry of entries) {
    const key = normalizeSpecLabel(entry.label);
    if (key === "") {
      continue;
    }
    map.set(key, entry.value.trim());
  }
  return map;
}

export function requiredSpecsMatchExceptMemoryStorage(
  baseline: ProductRequiredSpecEntry[],
  candidate: ProductRequiredSpecEntry[],
) {
  const baselineMap = specMap(baseline);
  const candidateMap = specMap(candidate);
  const labels = new Set([...baselineMap.keys(), ...candidateMap.keys()]);

  for (const label of labels) {
    if (isMemoryStorageSpecLabel(label)) {
      continue;
    }

    if (isMeterSpecLabel(label)) {
      continue;
    }

    if (baselineMap.get(label) !== candidateMap.get(label)) {
      return false;
    }
  }

  return true;
}

export function requiredSpecsEntriesEqual(
  left: ProductRequiredSpecEntry[],
  right: ProductRequiredSpecEntry[],
) {
  const leftMap = specMap(left);
  const rightMap = specMap(right);

  if (leftMap.size !== rightMap.size) {
    return false;
  }

  for (const [label, value] of leftMap) {
    if (rightMap.get(label) !== value) {
      return false;
    }
  }

  return true;
}

function isPermanentStorageLabel(label: string) {
  if (isTemporaryMemorySpecLabel(label)) {
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

export function extractVariantStorageFromRequiredSpecs(
  entries: ProductRequiredSpecEntry[],
) {
  let permanentStorage = "";
  let operationalMemory = "";

  for (const entry of entries) {
    if (isTemporaryMemorySpecLabel(entry.label)) {
      operationalMemory = entry.value.trim();
      continue;
    }

    if (isPermanentStorageLabel(entry.label)) {
      permanentStorage = entry.value.trim();
    }
  }

  return { permanentStorage, operationalMemory };
}

export function extractColorFromRequiredSpecs(
  entries: ProductRequiredSpecEntry[],
) {
  for (const entry of entries) {
    if (isColorSpecLabel(entry.label)) {
      return entry.value.trim();
    }
  }

  return "";
}

export function extractMeterFromRequiredSpecs(
  entries: ProductRequiredSpecEntry[],
) {
  for (const entry of entries) {
    if (isMeterSpecLabel(entry.label)) {
      return entry.value.trim();
    }
  }

  return "";
}

export function extractPortCountFromRequiredSpecs(
  entries: ProductRequiredSpecEntry[],
) {
  for (const entry of entries) {
    if (isPortCountSpecLabel(entry.label)) {
      return entry.value.trim();
    }
  }

  return "";
}

export function extractPoeCountFromRequiredSpecs(
  entries: ProductRequiredSpecEntry[],
) {
  for (const entry of entries) {
    if (isPoeCountSpecLabel(entry.label)) {
      return entry.value.trim();
    }
  }

  return "";
}

export function extractTransferSpeedFromRequiredSpecs(
  entries: ProductRequiredSpecEntry[],
) {
  for (const entry of entries) {
    if (isTransferSpeedSpecLabel(entry.label)) {
      return entry.value.trim();
    }
  }

  return "";
}

export function extractColorHexFromRequiredSpecs(
  entries: ProductRequiredSpecEntry[],
) {
  for (const entry of entries) {
    if (isColorHexSpecLabel(entry.label)) {
      return entry.value.trim();
    }
  }

  return "";
}

export type BuildVariantAttributesOptions = {
  /**
   * Rəng / Daimi yaddaş / Müvəqqəti yaddaş yalnız telefon-planşet
   * (Smartfonlar və aksesuarlar) kateqoriyasında variant atributu olur.
   * Default: true — geriyə uyğunluq üçün test və köhnə çağırışlarda.
   */
  includePhoneTabletVariantAttributes?: boolean;
};

export function buildVariantAttributesFromRequiredSpecs(
  entries: ProductRequiredSpecEntry[],
  options: BuildVariantAttributesOptions = {},
) {
  const includePhoneTabletVariantAttributes =
    options.includePhoneTabletVariantAttributes !== false;
  const { permanentStorage, operationalMemory } =
    extractVariantStorageFromRequiredSpecs(entries);
  const attributes: Record<string, string> = {};

  if (includePhoneTabletVariantAttributes) {
    if (permanentStorage !== "") {
      attributes.Yaddaş = permanentStorage;
    }
    if (operationalMemory !== "") {
      attributes.RAM = operationalMemory;
    }

    const color = extractColorFromRequiredSpecs(entries);
    if (color !== "") {
      attributes.Rəng = color;
    }

    const colorHex = extractColorHexFromRequiredSpecs(entries);
    if (color !== "" && colorHex !== "") {
      attributes["Rəng kodu"] = colorHex;
    }
  }

  const meter = extractMeterFromRequiredSpecs(entries);
  if (meter !== "") {
    attributes.Metr = meter;
  }

  const portCount = extractPortCountFromRequiredSpecs(entries);
  if (portCount !== "") {
    attributes[PORT_COUNT_SPEC_LABEL] = portCount;
  }

  const poeCount = extractPoeCountFromRequiredSpecs(entries);
  if (poeCount !== "") {
    attributes[POE_COUNT_SPEC_LABEL] = poeCount;
  }

  const transferSpeed = extractTransferSpeedFromRequiredSpecs(entries);
  if (transferSpeed !== "") {
    attributes[TRANSFER_SPEED_SPEC_LABEL] = transferSpeed;
  }

  return attributes;
}

export function parseVariantAttributes(value: unknown): Record<string, string> {
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

export function requiredSpecRowsForVariantEdit(
  requiredSpecs: ProductRequiredSpecEntry[],
  attributes: Record<string, string>,
): ProductRequiredSpecRow[] {
  const rows = requiredSpecEntriesToRows(requiredSpecs);
  if (rows.length === 0) {
    return rows;
  }

  return rows.map((row) => {
    if (isColorSpecLabel(row.label) && attributes.Rəng !== undefined) {
      const colorHex =
        attributes["Rəng kodu"]?.trim() ||
        attributes.colorHex?.trim() ||
        attributes.hex?.trim() ||
        "";
      return {
        ...row,
        value: attributes.Rəng,
        ...(colorHex !== "" ? { colorHex } : {}),
      };
    }
    if (isPermanentStorageLabel(row.label) && attributes.Yaddaş !== undefined) {
      return { ...row, value: attributes.Yaddaş };
    }
    if (isTemporaryMemorySpecLabel(row.label) && attributes.RAM !== undefined) {
      return { ...row, value: attributes.RAM };
    }
    if (isMeterSpecLabel(row.label) && attributes.Metr !== undefined) {
      return { ...row, value: attributes.Metr };
    }
    if (
      isPortCountSpecLabel(row.label) &&
      attributes[PORT_COUNT_SPEC_LABEL] !== undefined
    ) {
      return { ...row, value: attributes[PORT_COUNT_SPEC_LABEL] };
    }
    if (
      isPoeCountSpecLabel(row.label) &&
      attributes[POE_COUNT_SPEC_LABEL] !== undefined
    ) {
      return { ...row, value: attributes[POE_COUNT_SPEC_LABEL] };
    }
    if (
      isTransferSpeedSpecLabel(row.label) &&
      attributes[TRANSFER_SPEED_SPEC_LABEL] !== undefined
    ) {
      return { ...row, value: attributes[TRANSFER_SPEED_SPEC_LABEL] };
    }
    return row;
  });
}

export function buildVariantNameFromRequiredSpecs(
  entries: ProductRequiredSpecEntry[],
  options: BuildVariantAttributesOptions = {},
) {
  const includePhoneTabletVariantAttributes =
    options.includePhoneTabletVariantAttributes !== false;
  const { permanentStorage, operationalMemory } = includePhoneTabletVariantAttributes
    ? extractVariantStorageFromRequiredSpecs(entries)
    : { permanentStorage: "", operationalMemory: "" };
  const color = includePhoneTabletVariantAttributes
    ? extractColorFromRequiredSpecs(entries)
    : "";
  const meter = extractMeterFromRequiredSpecs(entries);
  const portCount = extractPortCountFromRequiredSpecs(entries);
  const poeCount = extractPoeCountFromRequiredSpecs(entries);
  const transferSpeed = extractTransferSpeedFromRequiredSpecs(entries);
  const computed = [
    permanentStorage,
    operationalMemory,
    color,
    meter,
    portCount !== "" ? `${portCount} port` : "",
    poeCount !== "" ? `${poeCount} PoE` : "",
    transferSpeed,
  ]
    .filter((part) => part !== "")
    .join(" / ");
  return computed !== "" ? computed : "Standart";
}

export const VARIANT_SKU_AUTO_HINT =
  `SKU avtomatik olaraq brend, model, Rəng, Daimi yaddaş, ${TEMPORARY_MEMORY_SPEC_LABEL}, Metr, ${PORT_COUNT_SPEC_LABEL}, ${POE_COUNT_SPEC_LABEL} və ${TRANSFER_SPEED_SPEC_LABEL} dəyərləri yazılmaqla tərtib olunur.`;

export function snapshotFromExistingProduct(
  product: ExistingCatalogProduct,
): ProductFormSnapshot {
  return {
    name: product.name,
    slug: product.slug,
    brandId: product.brand?.id ?? "",
    categoryId: product.categoryId,
    description: product.description?.trim() ?? "",
    seoTitle: product.seoTitle?.trim() ?? "",
    seoDescription: product.seoDescription?.trim() ?? "",
    requiredSpecs: parseProductRequiredSpecs(product.requiredSpecs),
  };
}

export function findExistingProductByExactName<T extends { name: string }>(
  products: T[],
  name: string,
): T | undefined {
  const normalizedName = normalizeProductNameQuery(name);
  if (normalizedName === "") {
    return undefined;
  }

  return products.find(
    (product) => normalizeProductNameQuery(product.name) === normalizedName,
  );
}

/** Matches catalog create form to an existing product by model name or canonical slug. */
export function findExistingProductForCreateForm<
  T extends { id: string; name: string; slug: string; status?: string },
>(products: T[], input: { modelName: string; productSlug: string }): T | undefined {
  const byName = findExistingProductByExactName(products, input.modelName);
  if (byName !== undefined) {
    return byName;
  }

  const normalizedSlug = input.productSlug.trim();
  if (normalizedSlug === "") {
    return undefined;
  }

  return findActiveProductBySlug(products, normalizedSlug);
}

export function findActiveProductBySlug<
  T extends { id: string; slug: string; status?: string },
>(products: T[], slug: string, excludeProductId?: string): T | undefined {
  const normalizedSlug = slug.trim();
  if (normalizedSlug === "") {
    return undefined;
  }

  return products.find(
    (product) =>
      product.slug === normalizedSlug &&
      product.id !== excludeProductId &&
      product.status !== "ARCHIVED",
  );
}

export function isVariantSkuTaken(
  products: Array<{
    id: string;
    variants?: {
      id?: string;
      sku: string;
      status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
    }[];
  }>,
  sku: string,
  options?: { forProductId?: string; excludeVariantId?: string },
): boolean {
  const normalizedSku = sku.trim().toUpperCase();
  if (normalizedSku === "") {
    return false;
  }

  return products.some((product) =>
    (product.variants ?? []).some((variant) => {
      if (variant.sku.trim().toUpperCase() !== normalizedSku) {
        return false;
      }
      if (
        options?.excludeVariantId !== undefined &&
        variant.id === options.excludeVariantId
      ) {
        return false;
      }
      if (
        variant.status === "ARCHIVED" &&
        options?.forProductId !== undefined &&
        product.id === options.forProductId
      ) {
        return false;
      }
      return true;
    }),
  );
}

export function createEmptyRequiredSpecRowIfNeeded(rows: ProductRequiredSpecRow[]) {
  return rows.length > 0 ? rows : [createEmptyRequiredSpecRow()];
}
