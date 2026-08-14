/**
 * Backoffice and catalog imports share this SKU builder: brand + model +
 * selected specs (color / memory / length / ports). Compact manufacturer
 * part numbers stay intact so BV1000I-GR does not collapse to BVIGR.
 */

export type VariantSkuSpecEntry = {
  label: string;
  value: string;
};

export const SKU_PATTERN = /^[A-Z0-9][A-Z0-9._-]{1,63}$/;

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

const COLOR_SKU_ABBREVIATIONS: Record<string, string> = {
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

function foldLabel(label: string) {
  return label
    .trim()
    .toLocaleLowerCase("az")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ");
}

function isTemporaryMemoryLabel(label: string) {
  const normalized = foldLabel(label);
  return (
    normalized.includes("ram") ||
    (normalized.includes("operativ") && normalized.includes("yadd")) ||
    normalized.includes("operativ memory") ||
    normalized.includes("operational memory") ||
    (normalized.includes("müvəqqəti") && normalized.includes("yadd")) ||
    (normalized.includes("muveqqeti") && normalized.includes("yadd"))
  );
}

function isPermanentStorageLabel(label: string) {
  if (isTemporaryMemoryLabel(label)) {
    return false;
  }
  const normalized = foldLabel(label);
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

function isColorSpecLabel(label: string) {
  const normalized = label.trim().toLocaleLowerCase("az");
  return (
    normalized === "rəng" ||
    normalized === "reng" ||
    normalized === "color" ||
    normalized === "renk"
  );
}

function isMeterSpecLabel(label: string) {
  const normalized = foldLabel(label);
  return (
    normalized === "metr" ||
    normalized === "meter" ||
    normalized === "metre" ||
    normalized === "uzunluq" ||
    normalized === "length"
  );
}

function isPortCountSpecLabel(label: string) {
  const normalized = foldLabel(label);
  return (
    normalized === "port" ||
    normalized.includes("port say") ||
    normalized.includes("port count") ||
    normalized.includes("ports")
  );
}

function isPoeCountSpecLabel(label: string) {
  const normalized = foldLabel(label);
  return normalized !== "" && normalized.includes("poe");
}

function isTransferSpeedSpecLabel(label: string) {
  const normalized = foldLabel(label);
  return (
    normalized === "sürət" ||
    normalized === "surət" ||
    normalized.includes("speed") ||
    normalized.includes("bandwidth") ||
    (normalized.includes("ötürmə") && normalized.includes("sür")) ||
    (normalized.includes("oturme") && normalized.includes("sur"))
  );
}

function specValue(
  entries: readonly VariantSkuSpecEntry[],
  matcher: (label: string) => boolean,
) {
  for (const entry of entries) {
    if (matcher(entry.label)) {
      return entry.value.trim();
    }
  }
  return "";
}

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

/** Compact manufacturer codes (BV1000I-GR, HD104) must not be over-abbreviated. */
export function looksLikeManufacturerPartNumber(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 40) {
    return false;
  }
  if (/\s/.test(trimmed)) {
    return false;
  }
  const compact = trimmed.replace(/[^A-Za-z0-9]/g, "");
  return /\d/.test(compact) && compact.length >= 3;
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
    .filter(
      (character) =>
        character === character.toUpperCase() &&
        character !== character.toLowerCase(),
    )
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
  if (looksLikeManufacturerPartNumber(name)) {
    return normalizeSkuToken(name, true).replace(/-/g, "").slice(0, 16);
  }

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

function abbreviateMeterSpecValue(value: string) {
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

  if (
    unitPart === "" ||
    unitPart[0] === "M" ||
    unitPart.startsWith("METR") ||
    unitPart.startsWith("METER")
  ) {
    return `${numeric}M`;
  }

  return `${numeric}M`;
}

function colorLabelEquals(left: string, right: string) {
  return left.trim().localeCompare(right.trim(), "az", { sensitivity: "base" }) === 0;
}

function abbreviateColorSpecValue(value: string) {
  const trimmed = value.trim();
  for (const [label, abbreviation] of Object.entries(COLOR_SKU_ABBREVIATIONS)) {
    if (colorLabelEquals(label, trimmed)) {
      return abbreviation;
    }
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

function abbreviateCountSpecValue(value: string, suffix: string) {
  const working = transliterateForSku(value).toUpperCase().replace(/\s+/g, "");
  if (working === "") {
    return "";
  }

  const numberMatch = working.match(/^(\d+(?:\.\d+)?)/);
  if (numberMatch !== null) {
    const numeric = numberMatch[1]!.replace(/\.0+$/, "").replace(/\.$/, "");
    return `${numeric}${suffix}`;
  }

  return normalizeSkuToken(value, true).slice(0, 6);
}

function abbreviateTransferSpeedSpecValue(value: string) {
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

  if (unitPart.startsWith("GBPS") || unitPart.startsWith("G")) {
    return `${numeric}G`;
  }

  if (unitPart.startsWith("MBPS") || unitPart[0] === "M") {
    return `${numeric}M`;
  }

  return numeric;
}

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

  return parts
    .join(" ")
    .split("")
    .map((character) => AZERBAIJANI_CHAR_MAP_FOR_SKU[character] ?? character)
    .join("")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildVariantSkuFromCatalogFields(input: {
  brandName: string;
  modelName: string;
  requiredSpecEntries: VariantSkuSpecEntry[];
  includePhoneTabletVariantAttributes?: boolean;
}) {
  const includePhoneTabletVariantAttributes =
    input.includePhoneTabletVariantAttributes !== false;
  const entries = input.requiredSpecEntries;
  const permanentStorage = includePhoneTabletVariantAttributes
    ? specValue(entries, isPermanentStorageLabel)
    : "";
  const operationalMemory = includePhoneTabletVariantAttributes
    ? specValue(entries, isTemporaryMemoryLabel)
    : "";
  const color = includePhoneTabletVariantAttributes
    ? specValue(entries, isColorSpecLabel)
    : "";
  const meter = specValue(entries, isMeterSpecLabel);
  const portCount = specValue(entries, isPortCountSpecLabel);
  const poeCount = specValue(entries, isPoeCountSpecLabel);
  const transferSpeed = specValue(entries, isTransferSpeedSpecLabel);

  const parts = [
    abbreviateBrandName(input.brandName),
    abbreviateModelName(input.modelName),
    abbreviateColorSpecValue(color),
    abbreviateMemorySpecValue(permanentStorage),
    abbreviateMemorySpecValue(operationalMemory),
    abbreviateMeterSpecValue(meter),
    abbreviateCountSpecValue(portCount, "P"),
    abbreviateCountSpecValue(poeCount, "E"),
    abbreviateTransferSpeedSpecValue(transferSpeed),
  ].filter((part) => part !== "");

  if (parts.length === 0) {
    return "";
  }

  return ensureValidSku(parts.join("-"));
}
