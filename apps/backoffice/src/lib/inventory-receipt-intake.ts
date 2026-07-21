import {
  buildProductSlugFromCatalogFields,
  buildVariantSkuFromCatalogFields,
  findExistingProductForCreateForm,
  parseProductRequiredSpecs,
  type ExistingCatalogProduct,
} from "./product-existing-catalog";
import {
  normalizeRequiredSpecRows,
  type ProductRequiredSpecEntry,
  type ProductRequiredSpecRow,
} from "./product-required-specs";

export type ReceiptCatalogProduct = ExistingCatalogProduct & {
  variants: { id: string; sku: string; barcode: string | null }[];
};

function normalizeReceiptCatalogSearch(value: string) {
  return value.trim().toLocaleLowerCase("az");
}

export function filterReceiptCatalogBrands<T extends { name: string }>(
  brands: T[],
  query: string,
  limit = 16,
): T[] {
  const normalized = normalizeReceiptCatalogSearch(query);
  const sorted = [...brands].sort((left, right) =>
    left.name.localeCompare(right.name, "az", { sensitivity: "base" }),
  );
  if (normalized === "") {
    return sorted.slice(0, limit);
  }
  return sorted
    .filter((brand) =>
      normalizeReceiptCatalogSearch(brand.name).includes(normalized),
    )
    .slice(0, limit);
}

export function filterReceiptCatalogModels<
  T extends {
    id: string;
    name: string;
    brand: { name: string } | null;
    status?: string;
  },
>(
  products: T[],
  input: { brandName: string; modelQuery: string },
  limit = 12,
): T[] {
  const brandNorm = normalizeReceiptCatalogSearch(input.brandName);
  const modelNorm = normalizeReceiptCatalogSearch(input.modelQuery);

  let list = products.filter(
    (product) => product.status === undefined || product.status !== "ARCHIVED",
  );

  if (brandNorm !== "") {
    list = list.filter((product) =>
      normalizeReceiptCatalogSearch(product.brand?.name ?? "").includes(
        brandNorm,
      ),
    );
  }

  if (modelNorm !== "") {
    list = list.filter((product) =>
      normalizeReceiptCatalogSearch(product.name).includes(modelNorm),
    );
  }

  list.sort((left, right) =>
    left.name.localeCompare(right.name, "az", { sensitivity: "base" }),
  );

  return list.slice(0, limit);
}

export function receiptVariantMatchesCatalogSearch(
  product: { name: string; brand: { name: string } | null },
  input: { brandName: string; modelName: string },
): boolean {
  const brandNorm = normalizeReceiptCatalogSearch(input.brandName);
  const modelNorm = normalizeReceiptCatalogSearch(input.modelName);
  if (brandNorm === "" && modelNorm === "") {
    return false;
  }
  if (brandNorm !== "") {
    const productBrand = normalizeReceiptCatalogSearch(
      product.brand?.name ?? "",
    );
    if (!productBrand.includes(brandNorm)) {
      return false;
    }
  }
  if (modelNorm !== "") {
    const productModel = normalizeReceiptCatalogSearch(product.name);
    if (!productModel.includes(modelNorm)) {
      return false;
    }
  }
  return true;
}

export function shouldOfferReceiptIntakeFromSearch(input: {
  searchQuery: string;
  filteredMatchCount: number;
  intakeMode: boolean;
}): boolean {
  return (
    !input.intakeMode &&
    input.searchQuery.trim() !== "" &&
    input.filteredMatchCount === 0
  );
}

export function receiptIntakeModelFromSearchQuery(searchQuery: string): string {
  return searchQuery.trim();
}

export type ReceiptCatalogVariantMatch = {
  variantId: string;
  productId: string;
  brandName: string;
  modelName: string;
};

export function findVariantIdByBarcode(
  products: ReceiptCatalogProduct[],
  rawBarcode: string,
): string | undefined {
  return findReceiptCatalogMatchByBarcode(products, rawBarcode)?.variantId;
}

/** Kataloqda barkoda görə variant və onun brend/model məlumatını qaytarır. */
export function findReceiptCatalogMatchByBarcode(
  products: ReceiptCatalogProduct[],
  rawBarcode: string,
): ReceiptCatalogVariantMatch | undefined {
  const normalized = rawBarcode.trim().toLowerCase();
  if (normalized === "") {
    return undefined;
  }

  for (const product of products) {
    for (const variant of product.variants) {
      const barcode = variant.barcode?.trim().toLowerCase();
      if (barcode !== undefined && barcode !== "" && barcode === normalized) {
        return {
          variantId: variant.id,
          productId: product.id,
          brandName: product.brand?.name ?? "",
          modelName: product.name,
        };
      }
    }
  }

  return undefined;
}

/** Brend, model və barkod kataloq variantı ilə uyğun gəlirsə variantı qaytarır. */
export function findReceiptVariantForCatalogInput(
  products: ReceiptCatalogProduct[],
  input: { brandName: string; modelName: string; barcode: string },
): ReceiptCatalogVariantMatch | undefined {
  const brandName = input.brandName.trim();
  const modelName = input.modelName.trim();
  const barcode = input.barcode.trim();

  if (brandName === "" || modelName === "" || barcode.length < 3) {
    return undefined;
  }

  const variantId = findVariantIdByBarcode(products, barcode);
  if (variantId === undefined) {
    return undefined;
  }

  for (const product of products) {
    const variant = product.variants.find((entry) => entry.id === variantId);
    if (variant === undefined) {
      continue;
    }

    if (
      !receiptVariantMatchesCatalogSearch(
        { name: product.name, brand: product.brand },
        { brandName, modelName },
      )
    ) {
      return undefined;
    }

    return {
      variantId: variant.id,
      productId: product.id,
      brandName: product.brand?.name ?? "",
      modelName: product.name,
    };
  }

  return undefined;
}

export function receiptBarcodeConflictsWithCatalogSearch(
  products: ReceiptCatalogProduct[],
  input: { brandName: string; modelName: string; barcode: string },
): boolean {
  const brandName = input.brandName.trim();
  const modelName = input.modelName.trim();
  const barcode = input.barcode.trim();

  if (brandName === "" || modelName === "" || barcode.length < 3) {
    return false;
  }

  const variantId = findVariantIdByBarcode(products, barcode);
  if (variantId === undefined) {
    return false;
  }

  return findReceiptVariantForCatalogInput(products, input) === undefined;
}

export function hasReceiptVariantCatalogSearch(input: {
  brandName: string;
  modelName: string;
  barcode: string;
}): boolean {
  if (input.brandName.trim() !== "") {
    return true;
  }
  if (input.modelName.trim() !== "") {
    return true;
  }
  return input.barcode.trim().length >= 3;
}

export function findExistingProductForReceiptIntake<
  T extends { id: string; name: string; slug: string; status?: string },
>(products: T[], input: { brandName: string; modelName: string }): T | undefined {
  const modelName = input.modelName.trim();
  if (modelName === "") {
    return undefined;
  }

  const productSlug = buildProductSlugFromCatalogFields({
    brandName: input.brandName,
    modelName,
  });

  return findExistingProductForCreateForm(products, {
    modelName,
    productSlug,
  });
}

export function receiptIntakeProductHasRequiredSpecs(
  product: { requiredSpecs?: unknown } | undefined,
): boolean {
  if (product === undefined) {
    return false;
  }
  return parseProductRequiredSpecs(product.requiredSpecs).length > 0;
}

export function shouldCollectReceiptIntakeRequiredSpecs(input: {
  intakeMode: boolean;
}): boolean {
  return input.intakeMode;
}

export function validateReceiptIntakeRequiredSpecs(input: {
  rows: ProductRequiredSpecRow[];
  productHasTemplate: boolean;
}): {
  entries: ProductRequiredSpecEntry[];
  errors: string[];
  intakeError: string | null;
} {
  const normalized = normalizeRequiredSpecRows(input.rows);
  if (normalized.errors.length > 0) {
    return {
      entries: normalized.entries,
      errors: normalized.errors,
      intakeError:
        "Variant xüsusiyyətlərini tamamlayın və yenidən cəhd edin.",
    };
  }

  if (input.productHasTemplate && normalized.entries.length === 0) {
    return {
      entries: [],
      errors: [],
      intakeError: "Məhsulun tələb olunan xüsusiyyətlərini daxil edin.",
    };
  }

  return {
    entries: normalized.entries,
    errors: [],
    intakeError: null,
  };
}

export function validateReceiptSourceDescription(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length < 2) {
    return "Mənbəni daxil edin (təchizatçı, ölkə və ya idxal yolu).";
  }
  if (trimmed.length > 80) {
    return "Mənbə ən çox 80 simvol ola bilər.";
  }
  return null;
}

export function validateReceiptIntakeFields(input: {
  brandName: string;
  modelName: string;
  barcode: string;
}): string | null {
  const brandName = input.brandName.trim();
  const modelName = input.modelName.trim();
  const barcode = input.barcode.trim();

  if (brandName === "") {
    return "Brend daxil edin.";
  }
  if (modelName === "") {
    return "Model daxil edin.";
  }
  if (barcode !== "" && barcode.length < 4) {
    return "Barkod ən azı 4 simvol olmalıdır.";
  }

  return null;
}

export function buildReceiptRequestBody(input: {
  variantId: string;
  intakeMode: boolean;
  brandName: string;
  modelName: string;
  barcode: string;
  locationId: string;
  quantity: number;
  sourceType: string;
  sourceDocumentId: string;
  reason: string;
  intakeRequiredSpecs?: ProductRequiredSpecEntry[];
  intakeVariantSku?: string;
}) {
  if (!input.intakeMode && input.variantId !== "") {
    return {
      variantId: input.variantId,
      locationId: input.locationId,
      quantity: input.quantity,
      sourceType: input.sourceType.trim(),
      sourceDocumentId: input.sourceDocumentId.trim(),
      reason: input.reason.trim(),
    };
  }

  const trimmedBarcode = input.barcode.trim();
  const intakeRequiredSpecs = input.intakeRequiredSpecs ?? [];
  return {
    intakeBrandName: input.brandName.trim(),
    intakeModelName: input.modelName.trim(),
    ...(trimmedBarcode !== "" ? { intakeBarcode: trimmedBarcode } : {}),
    ...(intakeRequiredSpecs.length > 0
      ? {
          intakeRequiredSpecs,
          ...(input.intakeVariantSku?.trim()
            ? { intakeVariantSku: input.intakeVariantSku.trim() }
            : {}),
        }
      : {}),
    locationId: input.locationId,
    quantity: input.quantity,
    sourceType: input.sourceType.trim(),
    sourceDocumentId: input.sourceDocumentId.trim(),
    reason: input.reason.trim(),
  };
}

export function buildReceiptIntakeVariantSku(input: {
  brandName: string;
  modelName: string;
  requiredSpecEntries: ProductRequiredSpecEntry[];
}): string {
  return buildVariantSkuFromCatalogFields({
    brandName: input.brandName,
    modelName: input.modelName,
    requiredSpecEntries: input.requiredSpecEntries,
  });
}
