export type BuildProductCatalogDisplayTitleInput = {
  brandName?: string | null;
  modelName: string;
  /** SKU variant rəngi (məs. kataloq siyahısı başlığı). */
  colorName?: string | null;
  /** Admin panel: brend seçilməyəndə modeldən əvvəl göstərilir. */
  missingBrandLabel?: string;
};

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
