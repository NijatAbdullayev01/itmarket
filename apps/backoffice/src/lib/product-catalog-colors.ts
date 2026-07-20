/** Standart kataloq rəngləri — storefront `resolveColorHex` ilə uyğunlaşdırılıb. */
import { resolveColorHex } from "@itmarket/ui";

export const PRODUCT_CATALOG_COLORS = [
  "Ağ",
  "Bej",
  "Bənövşəyi",
  "Boz",
  "Çəhrayı",
  "Dərin bənövşəyi",
  "Gümüşü",
  "Kosmik narıncı",
  "Mavi",
  "Narıncı",
  "Qara",
  "Qırmızı",
  "Qızılı",
  "Sarı",
  "Space Gray",
  "Titan",
  "Titan Ağ",
  "Titan Bənövşəyi",
  "Titan Gümüşü",
  "Titan Mavi",
  "Titan Qara",
  "Tünd mavi",
  "Ultramarin",
  "Ultramarin mavi",
  "Yaşıl",
] as const;

/** SKU seqmenti üçün kataloq rənglərinin azərbaycanca qısalmaları. */
export const PRODUCT_CATALOG_COLOR_SKU_ABBREVIATIONS: Record<
  (typeof PRODUCT_CATALOG_COLORS)[number],
  string
> = {
  Ağ: "AG",
  Bej: "BEJ",
  Bənövşəyi: "BNV",
  Boz: "BOZ",
  Çəhrayı: "CHR",
  "Dərin bənövşəyi": "DBN",
  Gümüşü: "GMS",
  "Kosmik narıncı": "KNR",
  Mavi: "MV",
  Narıncı: "NRC",
  Qara: "QRA",
  Qırmızı: "QRM",
  Qızılı: "QZL",
  Sarı: "SR",
  "Space Gray": "SG",
  Titan: "TTN",
  "Titan Ağ": "TAG",
  "Titan Bənövşəyi": "TBN",
  "Titan Gümüşü": "TGM",
  "Titan Mavi": "TMV",
  "Titan Qara": "TQ",
  "Tünd mavi": "TNM",
  Ultramarin: "ULT",
  "Ultramarin mavi": "UMV",
  Yaşıl: "YSL",
};

export function catalogColorLabelEquals(left: string, right: string): boolean {
  return (
    left.trim().localeCompare(right.trim(), "az", { sensitivity: "base" }) === 0
  );
}

function colorLabelEquals(left: string, right: string) {
  return catalogColorLabelEquals(left, right);
}

export function isProductCatalogColorListed(label: string): boolean {
  const trimmed = label.trim();
  if (trimmed === "") {
    return false;
  }

  return PRODUCT_CATALOG_COLORS.some((option) =>
    colorLabelEquals(option, trimmed),
  );
}

export function mergeProductCatalogColorOptions(
  currentValue: string,
  extraLabels: readonly string[],
  excludedLabels: readonly string[] = [],
): string[] {
  const options = listProductCatalogColorOptions(currentValue);
  const merged = [...options];

  for (const extra of extraLabels) {
    const trimmed = extra.trim();
    if (trimmed === "") {
      continue;
    }

    if (!merged.some((option) => colorLabelEquals(option, trimmed))) {
      merged.push(trimmed);
    }
  }

  return merged.filter(
    (option) =>
      !excludedLabels.some((excluded) => colorLabelEquals(option, excluded)),
  );
}

export function listProductCatalogColorOptions(currentValue: string): string[] {
  const trimmed = currentValue.trim();
  const options = [...PRODUCT_CATALOG_COLORS];

  if (
    trimmed !== "" &&
    !options.some((option) => colorLabelEquals(option, trimmed))
  ) {
    return [trimmed, ...options];
  }

  return options;
}

export function abbreviateCatalogColorForSku(colorValue: string): string | null {
  const trimmed = colorValue.trim();
  if (trimmed === "") {
    return null;
  }

  for (const catalogColor of PRODUCT_CATALOG_COLORS) {
    if (colorLabelEquals(catalogColor, trimmed)) {
      return PRODUCT_CATALOG_COLOR_SKU_ABBREVIATIONS[catalogColor];
    }
  }

  return null;
}

export function resolveProductCatalogColorHex(
  colorLabel: string,
  colorHexOverride?: string | null,
): string | null {
  const override = colorHexOverride?.trim();
  if (
    override !== undefined &&
    override !== "" &&
    /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(override)
  ) {
    return override;
  }

  return resolveColorHex(colorLabel, {});
}
