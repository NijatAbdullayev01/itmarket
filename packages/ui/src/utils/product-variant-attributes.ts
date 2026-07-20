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
  "Daimi yaddaş",
  "daimi yaddaş",
  "Yaddaş",
  "yaddaş",
  "Storage",
  "storage",
  "ROM",
  "rom",
] as const;

export const RAM_ATTRIBUTE_KEYS = [
  "Müvəqqəti yaddaş",
  "müvəqqəti yaddaş",
  "Muveqqeti yaddas",
  "RAM",
  "ram",
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
  "space gray": "#86868b",
  "titan gümüşü": "#c0c0c0",
  "titan gumusu": "#c0c0c0",
};

export type VariantAttributeInput = {
  id: string;
  name?: string;
  attributes: Record<string, string>;
  available: number;
};

/** Canonicalize catalog variant attributes for storefront pickers. */
export function normalizeVariantAttributes(
  attributes: Record<string, string>,
  variantName?: string,
): Record<string, string> {
  const next: Record<string, string> = { ...attributes };

  for (const key of STORAGE_ATTRIBUTE_KEYS) {
    const value = next[key]?.trim();
    if (value && !next.Yaddaş?.trim()) {
      next.Yaddaş = value;
      break;
    }
  }

  const nameParts =
    variantName === undefined
      ? []
      : variantName.split("/").map((part) => part.trim());

  if (
    !findStorageAttribute(next) &&
    variantName !== undefined &&
    variantName.trim() !== ""
  ) {
    const storageFromBullet = inferStorageFromVariantName(variantName);
    if (storageFromBullet !== null) {
      next.Yaddaş = storageFromBullet;
    }
  }

  if (!findStorageAttribute(next) && nameParts[0] !== undefined && nameParts[0] !== "") {
    if (looksLikeStorageLabel(nameParts[0])) {
      next.Yaddaş = nameParts[0];
    }
  }

  for (const key of RAM_ATTRIBUTE_KEYS) {
    const value = next[key]?.trim();
    if (value && !next.RAM?.trim()) {
      next.RAM = value;
      break;
    }
  }

  if (!findRamAttribute(next) && nameParts[1] !== undefined && nameParts[1] !== "") {
    next.RAM = nameParts[1];
  }

  if (
    !findColorAttribute(next) &&
    variantName !== undefined &&
    variantName.trim() !== ""
  ) {
    const inferredColor = inferColorFromVariantName(variantName);
    if (inferredColor !== null) {
      next.Rəng = inferredColor;
    }
  }

  return next;
}

export function variantAttributesForSelection(
  variant: VariantAttributeInput,
): Record<string, string> {
  return normalizeVariantAttributes(variant.attributes, variant.name);
}

function normalizeAttributeValue(value: string): string {
  return value.trim().toLocaleLowerCase("az");
}

/** Canonical storage key for picker matching (512 GB === 512GB). */
export function normalizeStorageOptionValue(label: string): string {
  return normalizeAttributeValue(label).replace(/\s+/g, "");
}

/** Canonical RAM key for picker matching (12 GB === 12GB). */
export function normalizeRamOptionValue(label: string): string {
  return normalizeStorageOptionValue(label);
}

function isColorAttributeKey(key: string): boolean {
  const normalized = normalizeAttributeValue(key);
  return (
    normalized === "rəng" ||
    normalized === "reng" ||
    normalized === "color" ||
    normalized === "renk"
  );
}

function inferStorageFromVariantName(variantName: string): string | null {
  const bulletMatch = variantName.match(/^(.+?)\s[·•]\s/u);
  if (bulletMatch?.[1]) {
    const candidate = bulletMatch[1].trim();
    if (candidate !== "" && looksLikeStorageLabel(candidate)) {
      return candidate;
    }
  }

  return null;
}

function inferColorFromVariantName(variantName: string): string | null {
  const bulletMatch = variantName.match(/\s[·•]\s(.+)$/u);
  if (bulletMatch?.[1]) {
    const candidate = bulletMatch[1].trim();
    if (candidate !== "" && !looksLikeStorageLabel(candidate)) {
      return candidate;
    }
  }

  const slashSegments = variantName.split("/").map((part) => part.trim());
  if (slashSegments.length >= 3 && slashSegments[2] !== "") {
    return slashSegments[2];
  }

  return null;
}

function looksLikeStorageLabel(value: string): boolean {
  const normalized = value.trim().toLocaleLowerCase("az");
  return /\d\s*(gb|tb|mb|kb)\b/u.test(normalized);
}

function isStorageAttributeKey(key: string): boolean {
  const normalized = normalizeAttributeValue(key);
  if (
    STORAGE_ATTRIBUTE_KEYS.some(
      (entry) => normalizeAttributeValue(entry) === normalized,
    )
  ) {
    return true;
  }

  return (
    normalized.includes("daimi") &&
    (normalized.includes("yadd") || normalized.includes("storage"))
  );
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

  for (const [key, value] of Object.entries(attributes)) {
    if (!value?.trim() || !isColorAttributeKey(key)) {
      continue;
    }

    return value.trim();
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

  for (const [key, value] of Object.entries(attributes)) {
    if (!value?.trim() || !isStorageAttributeKey(key)) {
      continue;
    }

    return value.trim();
  }

  return null;
}

export function findRamAttribute(
  attributes: Record<string, string>,
): string | null {
  for (const key of RAM_ATTRIBUTE_KEYS) {
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
  return label ? normalizeStorageOptionValue(label) : null;
}

/** Vitrin/kataloq kartları üçün daimi yaddaş mətni (orijinal yazılış). */
export function getVariantPermanentStorageLabel(
  attributes: Record<string, string>,
  variantName?: string,
): string | null {
  return findStorageAttribute(
    normalizeVariantAttributes(attributes, variantName),
  );
}

export function getRamValue(attributes: Record<string, string>): string | null {
  const label = findRamAttribute(attributes);
  return label ? normalizeRamOptionValue(label) : null;
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
  variantName?: string,
): boolean {
  const value = getColorValue(normalizeVariantAttributes(attributes, variantName));
  if (value === null) {
    return false;
  }
  return value === colorValue;
}

export function variantMatchesStorage(
  attributes: Record<string, string>,
  storageValue: string,
  variantName?: string,
): boolean {
  const value = getStorageValue(
    normalizeVariantAttributes(attributes, variantName),
  );
  if (value === null) {
    return false;
  }
  return value === storageValue;
}

export function variantMatchesRam(
  attributes: Record<string, string>,
  ramValue: string,
  variantName?: string,
): boolean {
  const value = getRamValue(normalizeVariantAttributes(attributes, variantName));
  if (value === null) {
    return false;
  }
  return value === ramValue;
}

export function resolveProductVariantId(
  variants: VariantAttributeInput[],
  selection: {
    colorValue?: string | null;
    storageValue?: string | null;
    ramValue?: string | null;
  },
): string {
  const matches = variants.filter((variant) => {
    const colorMatch =
      !selection.colorValue ||
      variantMatchesColor(
        variant.attributes,
        selection.colorValue,
        variant.name,
      );
    const storageMatch =
      !selection.storageValue ||
      variantMatchesStorage(
        variant.attributes,
        selection.storageValue,
        variant.name,
      );
    const ramMatch =
      !selection.ramValue ||
      variantMatchesRam(variant.attributes, selection.ramValue, variant.name);

    return colorMatch && storageMatch && ramMatch;
  });

  return (
    matches.find((variant) => variant.available > 0)?.id ??
    matches[0]?.id ??
    variants.find((variant) => variant.available > 0)?.id ??
    variants[0]?.id ??
    ""
  );
}
