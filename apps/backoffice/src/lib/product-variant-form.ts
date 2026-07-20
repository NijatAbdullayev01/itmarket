import {
  buildVariantAttributesFromRequiredSpecs,
  buildVariantNameFromRequiredSpecs,
  isVariantSkuTaken,
  type ExistingCatalogProduct,
} from "./product-existing-catalog";

export const VARIANT_MONEY_PATTERN = /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/;

export function buildVariantSubmitFormData(input: {
  variantSku: string;
  variantBarcode: string;
  variantPrice: string;
  variantDiscountedPrice: string;
  requiredSpecEntries: { label: string; value: string }[];
}) {
  const variantForm = new FormData();
  variantForm.set("sku", input.variantSku.trim());
  variantForm.set("barcode", input.variantBarcode.trim());
  const regularPrice = input.variantPrice.trim();
  const discountedPrice = input.variantDiscountedPrice.trim();
  if (discountedPrice !== "") {
    variantForm.set("price", discountedPrice);
    variantForm.set("previousPrice", regularPrice);
  } else {
    variantForm.set("price", regularPrice);
  }
  const attributes = buildVariantAttributesFromRequiredSpecs(
    input.requiredSpecEntries,
  );
  if (attributes.Yaddaş !== undefined) {
    variantForm.set("permanentStorage", attributes.Yaddaş);
  }
  if (attributes.RAM !== undefined) {
    variantForm.set("operationalMemory", attributes.RAM);
  }
  if (attributes.Rəng !== undefined) {
    variantForm.set("color", attributes.Rəng);
  }
  variantForm.set(
    "variantName",
    buildVariantNameFromRequiredSpecs(input.requiredSpecEntries),
  );
  return variantForm;
}

export type SkuVariantFieldErrors = {
  productId?: string;
  sku?: string;
  price?: string;
  discountedPrice?: string;
  storage?: string;
  quantity?: string;
  image?: string;
};

export function validateSkuVariantFields(input: {
  productId: string;
  generatedVariantSku: string;
  variantPrice: string;
  variantDiscountedPrice: string;
  requiredSpecEntries: { label: string; value: string }[];
  variantQuantity: string;
  existingProducts: ExistingCatalogProduct[];
  canReceiveStock: boolean;
  defaultStockLocationId: string | null;
  requireProductId?: boolean;
  excludeVariantId?: string;
}): SkuVariantFieldErrors {
  const errors: SkuVariantFieldErrors = {};
  const attributes = buildVariantAttributesFromRequiredSpecs(
    input.requiredSpecEntries,
  );
  const requireProductId = input.requireProductId ?? true;

  if (requireProductId && input.productId === "") {
    errors.productId = "SKU əlavə etmək üçün məhsul seçin.";
  }

  if (input.generatedVariantSku === "") {
    errors.sku =
      "SKU yaratmaq üçün məhsul, daimi yaddaş və müvəqqəti yaddaş dəyərlərini daxil edin.";
  } else if (
    isVariantSkuTaken(input.existingProducts, input.generatedVariantSku, {
      forProductId: input.productId,
      excludeVariantId: input.excludeVariantId,
    })
  ) {
    errors.sku =
      "Bu SKU artıq kataloqda mövcuddur. Rəng, daimi və ya müvəqqəti yaddaş kombinasiyasını dəyişin.";
  }

  const regularPrice = input.variantPrice.trim();
  if (regularPrice === "") {
    errors.price = "Cari qiymət tələb olunur";
  } else if (!VARIANT_MONEY_PATTERN.test(regularPrice)) {
    errors.price = "Cari qiymət düzgün formatda olmalıdır (məs: 4299.99)";
  }

  const discountedPrice = input.variantDiscountedPrice.trim();
  if (discountedPrice !== "") {
    if (!VARIANT_MONEY_PATTERN.test(discountedPrice)) {
      errors.discountedPrice =
        "Endirimli qiymət düzgün formatda olmalıdır (məs: 3999.99)";
    } else if (
      regularPrice !== "" &&
      Number(discountedPrice) >= Number(regularPrice)
    ) {
      errors.discountedPrice =
        "Endirimli qiymət cari qiymətdən aşağı olmalıdır";
    }
  }

  if (attributes.Yaddaş === undefined || attributes.RAM === undefined) {
    errors.storage =
      "Variant üçün «Daimi yaddaş» və «Müvəqqəti yaddaş» dəyərlərini daxil edin.";
  }

  const quantityRaw = input.variantQuantity.trim();
  if (quantityRaw !== "") {
    const quantityValue = Number(quantityRaw);
    if (!Number.isInteger(quantityValue) || quantityValue < 0) {
      errors.quantity = "Say tam ədəd olmalıdır (0 və ya daha çox)";
    } else if (
      quantityValue > 0 &&
      (!input.canReceiveStock || input.defaultStockLocationId === null)
    ) {
      errors.quantity =
        "Stok yazmaq üçün anbar məntəqəsi və stok qəbulu icazəsi lazımdır";
    }
  }

  return errors;
}

function readVariantFormMetadata(form: FormData) {
  const permanentStorage = String(form.get("permanentStorage") ?? "").trim();
  const operationalMemory = String(form.get("operationalMemory") ?? "").trim();
  const attributes: Record<string, string> = {};
  if (permanentStorage !== "") {
    attributes.Yaddaş = permanentStorage;
  }
  if (operationalMemory !== "") {
    attributes.RAM = operationalMemory;
  }
  const color = String(form.get("color") ?? "").trim();
  if (color !== "") {
    attributes.Rəng = color;
  }
  const explicitName = String(form.get("variantName") ?? "").trim();
  const name =
    explicitName !== ""
      ? explicitName
      : [permanentStorage, operationalMemory]
          .filter((part) => part !== "")
          .join(" / ");
  return {
    sku: String(form.get("sku") ?? "").trim(),
    barcode: String(form.get("barcode") ?? "").trim(),
    name,
    attributes,
  };
}

function readVariantFormPrice(form: FormData) {
  const previousPriceRaw = String(form.get("previousPrice") ?? "").trim();
  return {
    price: String(form.get("price") ?? "").trim(),
    previousPrice: previousPriceRaw === "" ? undefined : previousPriceRaw,
  };
}

export function buildCreateCatalogVariantPayload(form: FormData) {
  const metadata = readVariantFormMetadata(form);
  const pricing = readVariantFormPrice(form);
  return {
    sku: metadata.sku,
    barcode: metadata.barcode || undefined,
    name: metadata.name,
    attributes: metadata.attributes,
    price: pricing.price,
    previousPrice: pricing.previousPrice,
    status: "ACTIVE" as const,
  };
}

export function buildUpdateCatalogVariantMetadataPayload(
  form: FormData,
  status: "DRAFT" | "ACTIVE" | "ARCHIVED",
) {
  const metadata = readVariantFormMetadata(form);
  return {
    sku: metadata.sku,
    barcode: metadata.barcode || undefined,
    name: metadata.name,
    attributes: metadata.attributes,
    status,
  };
}

export function buildUpdateCatalogVariantPricePayload(form: FormData) {
  return readVariantFormPrice(form);
}
