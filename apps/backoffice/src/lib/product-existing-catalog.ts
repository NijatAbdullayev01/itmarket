import type { ProductRequiredSpecEntry } from "./product-required-specs";
import {
  createEmptyRequiredSpecRow,
  isColorHexSpecLabel,
  isColorSpecLabel,
  isTemporaryMemorySpecLabel,
  TEMPORARY_MEMORY_SPEC_LABEL,
  type ProductRequiredSpecRow,
} from "./product-required-specs";
import { abbreviateCatalogColorForSku } from "./product-catalog-colors";
import { normalizeProductNameQuery } from "./product-name-search";
import { slugify } from "./slugify";

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
  requiredSpecs: ProductRequiredSpecEntry[];
  variants?: { sku: string }[];
};

export type ProductFormSnapshot = {
  name: string;
  slug: string;
  brandId: string;
  categoryId: string;
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

export function buildVariantAttributesFromRequiredSpecs(
  entries: ProductRequiredSpecEntry[],
) {
  const { permanentStorage, operationalMemory } =
    extractVariantStorageFromRequiredSpecs(entries);
  const attributes: Record<string, string> = {};

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
    return row;
  });
}

export function buildVariantNameFromRequiredSpecs(
  entries: ProductRequiredSpecEntry[],
) {
  const { permanentStorage, operationalMemory } =
    extractVariantStorageFromRequiredSpecs(entries);
  return [permanentStorage, operationalMemory].filter((part) => part !== "").join(" / ");
}

const AZERBAIJANI_CHAR_MAP_FOR_SKU: Record<string, string> = {
  ə: "e",
  ı: "i",
  ö: "o",
  ü: "u",
  ğ: "g",
  ç: "c",
  ş: "s",
  Ə: "e",
  I: "i",
  İ: "i",
  Ö: "o",
  Ü: "u",
  Ğ: "g",
  Ç: "c",
  Ş: "s",
};

const SKU_PATTERN = /^[A-Z0-9][A-Z0-9._-]{1,63}$/;

function transliterateForSku(value: string) {
  return value
    .trim()
    .split("")
    .map((character) => AZERBAIJANI_CHAR_MAP_FOR_SKU[character] ?? character)
    .join("");
}

function normalizeSkuToken(value: string, compactSpaces = false) {
  let working = transliterateForSku(value);
  if (compactSpaces) {
    working = working.replace(/\s+/g, "");
  }

  return working
    .toLocaleUpperCase("en-US")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function ensureValidSku(candidate: string) {
  let sku = candidate
    .slice(0, 64)
    .replace(/[^A-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (sku === "") {
    return "";
  }

  if (!/^[A-Z0-9]/.test(sku)) {
    sku = `X${sku}`.slice(0, 64);
  }

  if (sku.length < 2) {
    sku = `${sku}0`;
  }

  return SKU_PATTERN.test(sku) ? sku : "";
}

function abbreviateBrandName(name: string) {
  const trimmed = transliterateForSku(name).trim();
  if (trimmed === "") {
    return "";
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .map((word) => word.replace(/[^a-zA-Z0-9]/g, ""))
      .filter((word) => word.length > 0)
      .map((word) => word[0]!.toUpperCase())
      .join("")
      .slice(0, 4);
  }

  const alnum = words[0]!.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (alnum.length <= 4) {
    return alnum;
  }

  return alnum.slice(0, 3);
}

function abbreviateModelToken(token: string) {
  const cleaned = token.replace(/[^a-zA-Z0-9]/g, "");
  if (cleaned === "") {
    return "";
  }

  const camelParts = cleaned.split(/(?=[A-Z])/).filter((part) => part.length > 0);
  if (
    camelParts.length >= 2 &&
    camelParts.every((part) => /^[a-zA-Z]+$/.test(part))
  ) {
    return camelParts
      .map((part) => part[0]!.toUpperCase())
      .join("")
      .slice(0, 4);
  }

  if (/^[a-zA-Z0-9]+$/.test(cleaned) && cleaned.length <= 4) {
    if (/\d/.test(cleaned)) {
      return cleaned.toUpperCase();
    }

    if (cleaned.length <= 3) {
      return cleaned[0]!.toUpperCase();
    }

    return cleaned.toUpperCase();
  }

  const capitalLetters = [...cleaned]
    .filter((character) => character === character.toUpperCase() && character !== character.toLowerCase())
    .join("");

  if (capitalLetters.length >= 2) {
    return capitalLetters.slice(0, 4);
  }

  if (capitalLetters.length === 1) {
    return capitalLetters;
  }

  return cleaned.slice(0, 2).toUpperCase();
}

function abbreviateModelName(name: string) {
  const tokens = transliterateForSku(name)
    .split(/[\s/+,]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return "";
  }

  return tokens
    .map((token) => abbreviateModelToken(token))
    .filter((token) => token !== "")
    .join("")
    .slice(0, 16);
}

function abbreviateMemorySpecValue(value: string) {
  const working = transliterateForSku(value).toUpperCase().replace(/\s+/g, "");
  if (working === "") {
    return "";
  }

  const numberMatch = working.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (numberMatch === null) {
    return normalizeSkuToken(value, true).slice(0, 6);
  }

  const numeric = numberMatch[1]!.replace(/\.0+$/, "").replace(/\.$/, "");
  const unitPart = numberMatch[2]!.replace(/[^A-Z]/g, "");

  if (unitPart.startsWith("TB")) {
    return `${numeric}T`;
  }

  if (unitPart.startsWith("GB")) {
    return `${numeric}G`;
  }

  if (unitPart[0] === "T") {
    return `${numeric}T`;
  }

  if (unitPart[0] === "G") {
    return `${numeric}G`;
  }

  return numeric;
}

function abbreviateColorSpecValue(value: string) {
  const catalogAbbreviation = abbreviateCatalogColorForSku(value);
  if (catalogAbbreviation !== null) {
    return catalogAbbreviation;
  }

  const tokens = transliterateForSku(value)
    .split(/[\s/+,]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return "";
  }

  if (tokens.length >= 2) {
    return tokens
      .map((token) => token.replace(/[^a-zA-Z0-9]/g, ""))
      .filter((token) => token.length > 0)
      .map((token) => token[0]!.toUpperCase())
      .join("")
      .slice(0, 4);
  }

  const word = tokens[0]!.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (word === "") {
    return "";
  }

  if (word.length <= 3) {
    return word;
  }

  return word.slice(0, 3);
}

export const VARIANT_SKU_AUTO_HINT =
  `SKU avtomatik olaraq brend, model, Rəng, Daimi yaddaş və ${TEMPORARY_MEMORY_SPEC_LABEL} dəyərləri yazılmaqla tərtib olunur.`;

export function buildProductSlugFromCatalogFields(input: {
  brandName: string;
  modelName: string;
}) {
  const parts = [input.brandName.trim(), input.modelName.trim()].filter(
    (part) => part !== "",
  );

  if (parts.length === 0) {
    return "";
  }

  return slugify(parts.join(" "));
}

export function buildVariantSkuFromCatalogFields(input: {
  brandName: string;
  modelName: string;
  requiredSpecEntries: ProductRequiredSpecEntry[];
}) {
  const { permanentStorage, operationalMemory } =
    extractVariantStorageFromRequiredSpecs(input.requiredSpecEntries);
  const color = extractColorFromRequiredSpecs(input.requiredSpecEntries);

  const parts = [
    abbreviateBrandName(input.brandName),
    abbreviateModelName(input.modelName),
    abbreviateColorSpecValue(color),
    abbreviateMemorySpecValue(permanentStorage),
    abbreviateMemorySpecValue(operationalMemory),
  ].filter((part) => part !== "");

  if (parts.length === 0) {
    return "";
  }

  return ensureValidSku(parts.join("-"));
}

export function snapshotFromExistingProduct(
  product: ExistingCatalogProduct,
): ProductFormSnapshot {
  return {
    name: product.name,
    slug: product.slug,
    brandId: product.brand?.id ?? "",
    categoryId: product.categoryId,
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
