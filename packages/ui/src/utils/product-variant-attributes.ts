export const COLOR_ATTRIBUTE_KEYS = [
  "Rəng",
  "rəng",
  "Color",
  "color",
  "Renk",
  "renk",
] as const;

export const COLOR_HEX_ATTRIBUTE_KEYS = [
  "Rəng kodu",
  "rəng kodu",
  "Color hex",
  "colorHex",
  "hex",
] as const;

export const STORAGE_ATTRIBUTE_KEYS = [
  "Yaddaş",
  "yaddaş",
  "Storage",
  "storage",
  "ROM",
  "rom",
] as const;

const COLOR_NAME_HEX: Record<string, string> = {
  qara: "#1a1a1a",
  ağ: "#f5f5f5",
  ag: "#f5f5f5",
  gümüşü: "#c0c0c0",
  gumusu: "#c0c0c0",
  mavi: "#2563eb",
  "tünd mavi": "#1e3a5f",
  "tund mavi": "#1e3a5f",
  qırmızı: "#dc2626",
  qirmizi: "#dc2626",
  yaşıl: "#16a34a",
  yasil: "#16a34a",
  bənövşəyi: "#7c3aed",
  benovseyi: "#7c3aed",
  çəhrayı: "#ec4899",
  cehrayi: "#ec4899",
  qızılı: "#d4af37",
  qizili: "#d4af37",
  narıncı: "#ea580c",
  narinci: "#ea580c",
  sarı: "#eab308",
  sari: "#eab308",
  boz: "#6b7280",
  bej: "#d4b896",
  titan: "#8b8d93",
  "titan qara": "#3d3d3f",
  "titan ağ": "#f2f2f2",
  "titan ag": "#f2f2f2",
  "titan mavi": "#4a5568",
  "titan bənövşəyi": "#5b4b8a",
  "titan benovseyi": "#5b4b8a",
  ultramarin: "#2e4a7a",
  "ultramarin mavi": "#2e4a7a",
  "kosmik narıncı": "#c45c2a",
  "kosmik narinci": "#c45c2a",
  "dərin bənövşəyi": "#5b4b8a",
  "derin benovseyi": "#5b4b8a",
  black: "#1a1a1a",
  white: "#f5f5f5",
  silver: "#c0c0c0",
  blue: "#2563eb",
  red: "#dc2626",
  green: "#16a34a",
  purple: "#7c3aed",
  pink: "#ec4899",
  gold: "#d4af37",
  orange: "#ea580c",
  yellow: "#eab308",
  gray: "#6b7280",
  grey: "#6b7280",
};

export type VariantAttributeInput = {
  id: string;
  attributes: Record<string, string>;
  available: number;
};

function normalizeAttributeValue(value: string): string {
  return value.trim().toLocaleLowerCase("az");
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(value.trim());
}

export function findColorAttribute(
  attributes: Record<string, string>,
): string | null {
  for (const key of COLOR_ATTRIBUTE_KEYS) {
    const value = attributes[key];
    if (value?.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function findStorageAttribute(
  attributes: Record<string, string>,
): string | null {
  for (const key of STORAGE_ATTRIBUTE_KEYS) {
    const value = attributes[key];
    if (value?.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function getColorValue(attributes: Record<string, string>): string | null {
  const label = findColorAttribute(attributes);
  return label ? normalizeAttributeValue(label) : null;
}

export function getStorageValue(
  attributes: Record<string, string>,
): string | null {
  const label = findStorageAttribute(attributes);
  return label ? normalizeAttributeValue(label) : null;
}

export function resolveColorHex(
  label: string,
  attributes: Record<string, string>,
): string | null {
  if (isHexColor(label)) {
    return label.trim();
  }

  for (const key of COLOR_HEX_ATTRIBUTE_KEYS) {
    const value = attributes[key];
    if (value && isHexColor(value)) {
      return value.trim();
    }
  }

  return COLOR_NAME_HEX[normalizeAttributeValue(label)] ?? null;
}

export function variantMatchesColor(
  attributes: Record<string, string>,
  colorValue: string,
): boolean {
  const value = getColorValue(attributes);
  return value === colorValue;
}

export function variantMatchesStorage(
  attributes: Record<string, string>,
  storageValue: string,
): boolean {
  const value = getStorageValue(attributes);
  return value === storageValue;
}

export function resolveProductVariantId(
  variants: VariantAttributeInput[],
  selection: {
    colorValue?: string | null;
    storageValue?: string | null;
  },
): string {
  const matches = variants.filter((variant) => {
    const colorMatch =
      !selection.colorValue ||
      variantMatchesColor(variant.attributes, selection.colorValue);
    const storageMatch =
      !selection.storageValue ||
      variantMatchesStorage(variant.attributes, selection.storageValue);

    return colorMatch && storageMatch;
  });

  return (
    matches.find((variant) => variant.available > 0)?.id ??
    matches[0]?.id ??
    variants.find((variant) => variant.available > 0)?.id ??
    variants[0]?.id ??
    ""
  );
}
