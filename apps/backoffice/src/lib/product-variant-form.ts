import {
  buildVariantAttributesFromRequiredSpecs,
  buildVariantNameFromRequiredSpecs,
  extractPoeCountFromRequiredSpecs,
  extractPortCountFromRequiredSpecs,
  extractTransferSpeedFromRequiredSpecs,
  isVariantSkuTaken,
  SKU_PATTERN,
  type ExistingCatalogProduct,
} from "./product-existing-catalog";
import {
  isPoeCountSpecLabel,
  isPortCountSpecLabel,
  isTransferSpeedSpecLabel,
  POE_COUNT_SPEC_LABEL,
  PORT_COUNT_SPEC_LABEL,
  TRANSFER_SPEED_SPEC_LABEL,
  type ProductRequiredSpecEntry,
} from "./product-required-specs";

export const VARIANT_MONEY_PATTERN = /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/;

function validateRequiredVariantSpecValues(
  entries: ProductRequiredSpecEntry[],
): string | undefined {
  const portCount = extractPortCountFromRequiredSpecs(entries);
  const poeCount = extractPoeCountFromRequiredSpecs(entries);
  const transferSpeed = extractTransferSpeedFromRequiredSpecs(entries);

  const needsPort = entries.some((entry) => isPortCountSpecLabel(entry.label));
  const needsPoe = entries.some((entry) => isPoeCountSpecLabel(entry.label));
  const needsSpeed = entries.some((entry) =>
    isTransferSpeedSpecLabel(entry.label),
  );

  const missing: string[] = [];
  if (needsPort && portCount === "") {
    missing.push("port sayı");
  }
  if (needsPoe && poeCount === "") {
    missing.push("PoE sayı");
  }
  if (needsSpeed && transferSpeed === "") {
    missing.push("ötürmə sürəti");
  }

  if (missing.length === 0) {
    return undefined;
  }

  return `Variant üçün ${missing.join(", ")} dəyərlərini daxil edin.`;
}

function applyVariantAttributesToFormData(
  variantForm: FormData,
  attributes: Record<string, string>,
) {
  if (attributes.Yaddaş !== undefined) {
    variantForm.set("permanentStorage", attributes.Yaddaş);
  }
  if (attributes.RAM !== undefined) {
    variantForm.set("operationalMemory", attributes.RAM);
  }
  if (attributes.Rəng !== undefined) {
    variantForm.set("color", attributes.Rəng);
  }
  const colorHex =
    attributes["Rəng kodu"]?.trim() ||
    attributes.colorHex?.trim() ||
    attributes.hex?.trim() ||
    "";
  if (colorHex !== "") {
    variantForm.set("colorHex", colorHex);
  }
  if (attributes.Metr !== undefined) {
    variantForm.set("meter", attributes.Metr);
  }
  if (attributes[PORT_COUNT_SPEC_LABEL] !== undefined) {
    variantForm.set("portCount", attributes[PORT_COUNT_SPEC_LABEL]);
  }
  if (attributes[POE_COUNT_SPEC_LABEL] !== undefined) {
    variantForm.set("poeCount", attributes[POE_COUNT_SPEC_LABEL]);
  }
  if (attributes[TRANSFER_SPEED_SPEC_LABEL] !== undefined) {
    variantForm.set("transferSpeed", attributes[TRANSFER_SPEED_SPEC_LABEL]);
  }
}

export function buildVariantSubmitFormData(input: {
  variantSku: string;
  variantBarcode: string;
  variantPrice: string;
  variantDiscountedPrice: string;
  requiredSpecEntries: { label: string; value: string }[];
  availableByOrder?: boolean;
  includePhoneTabletVariantAttributes?: boolean;
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
  const attributeOptions = {
    includePhoneTabletVariantAttributes:
      input.includePhoneTabletVariantAttributes,
  };
  const attributes = buildVariantAttributesFromRequiredSpecs(
    input.requiredSpecEntries,
    attributeOptions,
  );
  applyVariantAttributesToFormData(variantForm, attributes);
  variantForm.set(
    "variantName",
    buildVariantNameFromRequiredSpecs(
      input.requiredSpecEntries,
      attributeOptions,
    ),
  );
  variantForm.set(
    "availableByOrder",
    input.availableByOrder === true ? "true" : "false",
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
  const requireProductId = input.requireProductId ?? true;
  const missingSpecMessage = validateRequiredVariantSpecValues(
    input.requiredSpecEntries,
  );

  if (requireProductId && input.productId === "") {
    errors.productId = "SKU əlavə etmək üçün məhsul seçin.";
  }

  const variantSku = input.generatedVariantSku.trim();
  if (variantSku === "") {
    errors.sku = "SKU tələb olunur.";
  } else if (!SKU_PATTERN.test(variantSku)) {
    errors.sku =
      "SKU 2–64 simvol olmalı, böyük hərf, rəqəm, nöqtə, alt xətt və tire ilə yazılmalıdır.";
  } else if (
    isVariantSkuTaken(input.existingProducts, variantSku, {
      forProductId: input.productId,
      excludeVariantId: input.excludeVariantId,
    })
  ) {
    errors.sku = "Bu SKU artıq kataloqda mövcuddur.";
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

  if (missingSpecMessage !== undefined) {
    errors.storage = missingSpecMessage;
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

export function followGeneratedSkuUnlessCustomized(input: {
  generatedSku: string;
  currentSku: string;
  lastGeneratedSku: string | null;
}): { sku: string; lastGeneratedSku: string } {
  if (input.lastGeneratedSku === null) {
    return {
      sku: input.currentSku,
      lastGeneratedSku: input.generatedSku,
    };
  }

  if (input.lastGeneratedSku === input.generatedSku) {
    return {
      sku: input.currentSku,
      lastGeneratedSku: input.lastGeneratedSku,
    };
  }

  const shouldFollowGenerated =
    input.currentSku === input.lastGeneratedSku || input.currentSku === "";

  return {
    sku: shouldFollowGenerated ? input.generatedSku : input.currentSku,
    lastGeneratedSku: input.generatedSku,
  };
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
  const colorHex = String(form.get("colorHex") ?? "").trim();
  if (color !== "" && colorHex !== "") {
    attributes["Rəng kodu"] = colorHex;
  }
  const meter = String(form.get("meter") ?? "").trim();
  if (meter !== "") {
    attributes.Metr = meter;
  }
  const portCount = String(form.get("portCount") ?? "").trim();
  if (portCount !== "") {
    attributes[PORT_COUNT_SPEC_LABEL] = portCount;
  }
  const poeCount = String(form.get("poeCount") ?? "").trim();
  if (poeCount !== "") {
    attributes[POE_COUNT_SPEC_LABEL] = poeCount;
  }
  const transferSpeed = String(form.get("transferSpeed") ?? "").trim();
  if (transferSpeed !== "") {
    attributes[TRANSFER_SPEED_SPEC_LABEL] = transferSpeed;
  }
  const explicitName = String(form.get("variantName") ?? "").trim();
  const computedName =
    explicitName !== ""
      ? explicitName
      : [
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
  const name = computedName !== "" ? computedName : "Standart";
  return {
    sku: String(form.get("sku") ?? "").trim(),
    barcode: String(form.get("barcode") ?? "").trim(),
    name,
    attributes,
    availableByOrder: String(form.get("availableByOrder") ?? "") === "true",
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
    availableByOrder: metadata.availableByOrder,
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
    availableByOrder: metadata.availableByOrder,
  };
}

export function buildUpdateCatalogVariantPricePayload(form: FormData) {
  return readVariantFormPrice(form);
}
