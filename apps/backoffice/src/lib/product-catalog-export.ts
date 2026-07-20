export type ProductCatalogExportVariant = {
  sku: string;
  name: string;
  price: string;
  barcode: string | null;
};

export type ProductCatalogExportProduct = {
  name: string;
  variants: ProductCatalogExportVariant[];
};

export type ProductCatalogExportRow = {
  productName: string;
  variantName: string;
  sku: string;
  price: number | string;
  barcode: string;
};

export const PRODUCT_CATALOG_EXPORT_HEADERS = [
  "Məhsul adı",
  "Variant",
  "SKU",
  "Qiymət (AZN)",
  "Barkod",
] as const;

function parsePriceForExport(price: string): number | string {
  const trimmed = price.trim();
  if (trimmed === "") {
    return "";
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : trimmed;
}

function compareAz(left: string, right: string) {
  return left.localeCompare(right, "az");
}

export function buildProductCatalogExportRows(
  products: ProductCatalogExportProduct[],
): ProductCatalogExportRow[] {
  const sortedProducts = [...products].sort((left, right) =>
    compareAz(left.name, right.name),
  );

  const rows: ProductCatalogExportRow[] = [];

  for (const product of sortedProducts) {
    const sortedVariants = [...product.variants].sort((left, right) =>
      compareAz(left.name, right.name),
    );

    if (sortedVariants.length === 0) {
      rows.push({
        productName: product.name,
        variantName: "",
        sku: "",
        price: "",
        barcode: "",
      });
      continue;
    }

    for (const variant of sortedVariants) {
      rows.push({
        productName: product.name,
        variantName: variant.name,
        sku: variant.sku,
        price: parsePriceForExport(variant.price),
        barcode: variant.barcode ?? "",
      });
    }
  }

  return rows;
}

function catalogExportFileName(date = new Date()) {
  const stamp = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baku",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return `mehsullar-${stamp}.xlsx`;
}

export async function downloadProductCatalogExcel(
  products: ProductCatalogExportProduct[],
) {
  const rows = buildProductCatalogExportRows(products);
  const XLSX = await import("xlsx");

  const sheetRows = [
    [...PRODUCT_CATALOG_EXPORT_HEADERS],
    ...rows.map((row) => [
      row.productName,
      row.variantName,
      row.sku,
      row.price,
      row.barcode,
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  worksheet["!cols"] = [
    { wch: 36 },
    { wch: 28 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Məhsullar");
  XLSX.writeFile(workbook, catalogExportFileName());
}
