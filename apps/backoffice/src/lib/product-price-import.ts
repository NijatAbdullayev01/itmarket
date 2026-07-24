import { VARIANT_MONEY_PATTERN } from "./product-variant-form";

export type ProductPriceImportParsedRow = {
  rowNumber: number;
  brand: string;
  model: string;
  price: string;
  previousPrice: string | null;
};

export type ProductPriceImportParseResult = {
  rows: ProductPriceImportParsedRow[];
  errors: string[];
};

export const PRODUCT_PRICE_IMPORT_HEADERS = [
  "Brend",
  "Model",
  "Qiymət (AZN)",
  "Əvvəlki qiymət (AZN)",
] as const;

const BRAND_HEADERS = new Set(["brend", "brand", "marka"]);
const MODEL_HEADERS = new Set(["model", "məhsul", "mehsul", "product"]);
const PRICE_HEADERS = new Set([
  "qiymət",
  "qiymet",
  "qiymət (azn)",
  "qiymet (azn)",
  "price",
  "price (azn)",
]);
const PREVIOUS_PRICE_HEADERS = new Set([
  "əvvəlki qiymət",
  "evvelki qiymet",
  "əvvəlki qiymət (azn)",
  "evvelki qiymet (azn)",
  "previous price",
  "previousprice",
  "list price",
  "köhnə qiymət",
  "kohne qiymet",
]);

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("az")
    .replace(/\s+/g, " ");
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return String(value).trim();
}

/**
 * Normalize Excel numeric/string money into API MONEY format.
 * Accepts 1299.5, "1 299,50", "1299.50".
 */
export function normalizeProductPriceImportMoney(
  value: unknown,
): string | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      return null;
    }
    const rounded = Math.round(value * 100) / 100;
    return rounded.toFixed(2);
  }

  let raw = cellToString(value);
  if (raw === "") {
    return null;
  }

  raw = raw.replace(/\s/g, "").replace("₼", "").replace(/azn/gi, "");

  if (raw.includes(",") && raw.includes(".")) {
    // 1,299.50 → 1299.50
    raw = raw.replace(/,/g, "");
  } else if (raw.includes(",")) {
    // 1299,50 → 1299.50
    raw = raw.replace(",", ".");
  }

  if (!VARIANT_MONEY_PATTERN.test(raw)) {
    const asNumber = Number(raw);
    if (!Number.isFinite(asNumber) || asNumber < 0) {
      return null;
    }
    raw = (Math.round(asNumber * 100) / 100).toFixed(2);
  }

  if (!VARIANT_MONEY_PATTERN.test(raw)) {
    return null;
  }

  // Prefer canonical two-decimal strings for API consistency.
  return Number(raw).toFixed(2);
}

function findColumnIndex(
  headers: string[],
  aliases: Set<string>,
): number {
  return headers.findIndex((header) => aliases.has(header));
}

export function parseProductPriceImportSheet(
  matrix: unknown[][],
): ProductPriceImportParseResult {
  if (matrix.length === 0) {
    return { rows: [], errors: ["Excel faylı boşdur"] };
  }

  const headerRow = (matrix[0] ?? []).map(normalizeHeader);
  const brandIndex = findColumnIndex(headerRow, BRAND_HEADERS);
  const modelIndex = findColumnIndex(headerRow, MODEL_HEADERS);
  const priceIndex = findColumnIndex(headerRow, PRICE_HEADERS);
  const previousPriceIndex = findColumnIndex(
    headerRow,
    PREVIOUS_PRICE_HEADERS,
  );

  const errors: string[] = [];
  if (brandIndex < 0) {
    errors.push('«Brend» sütunu tapılmadı');
  }
  if (modelIndex < 0) {
    errors.push('«Model» sütunu tapılmadı');
  }
  if (priceIndex < 0) {
    errors.push('«Qiymət (AZN)» sütunu tapılmadı');
  }
  if (errors.length > 0) {
    return { rows: [], errors };
  }

  const rows: ProductPriceImportParsedRow[] = [];

  for (let index = 1; index < matrix.length; index += 1) {
    const row = matrix[index] ?? [];
    const brand = cellToString(row[brandIndex]);
    const model = cellToString(row[modelIndex]);
    const rawPrice = row[priceIndex];
    const rawPrevious =
      previousPriceIndex >= 0 ? row[previousPriceIndex] : undefined;

    const isBlankRow =
      brand === "" &&
      model === "" &&
      cellToString(rawPrice) === "" &&
      cellToString(rawPrevious) === "";
    if (isBlankRow) {
      continue;
    }

    const rowNumber = index + 1;
    const price = normalizeProductPriceImportMoney(rawPrice);
    if (brand === "" || model === "") {
      errors.push(`Sətir ${rowNumber}: brend və model tələb olunur`);
      continue;
    }
    if (price === null) {
      errors.push(`Sətir ${rowNumber}: qiymət formatı yanlışdır`);
      continue;
    }

    let previousPrice: string | null = null;
    if (rawPrevious !== undefined && cellToString(rawPrevious) !== "") {
      previousPrice = normalizeProductPriceImportMoney(rawPrevious);
      if (previousPrice === null) {
        errors.push(`Sətir ${rowNumber}: əvvəlki qiymət formatı yanlışdır`);
        continue;
      }
    }

    rows.push({
      rowNumber,
      brand,
      model,
      price,
      previousPrice,
    });
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push("Yenilənəcək qiymət sətiri tapılmadı");
  }

  return { rows, errors };
}

export async function parseProductPriceImportFile(
  file: File,
): Promise<ProductPriceImportParseResult> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (firstSheetName === undefined) {
    return { rows: [], errors: ["Excel faylında vərəq yoxdur"] };
  }
  const sheet = workbook.Sheets[firstSheetName];
  if (sheet === undefined) {
    return { rows: [], errors: ["Excel vərəqi oxunmadı"] };
  }
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][];
  return parseProductPriceImportSheet(matrix);
}

export async function downloadProductPriceImportTemplate() {
  const XLSX = await import("xlsx");
  const sheetRows = [
    [...PRODUCT_PRICE_IMPORT_HEADERS],
    ["Cisco", "3560", 450, ""],
    ["Apple", "iPhone 15", 2499.99, 2799.99],
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  worksheet["!cols"] = [
    { wch: 18 },
    { wch: 24 },
    { wch: 14 },
    { wch: 20 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Qiymətlər");
  XLSX.writeFile(workbook, "qiymet-yenileme-sablonu.xlsx");
}
