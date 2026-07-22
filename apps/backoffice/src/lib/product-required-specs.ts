export type ProductRequiredSpecEntry = {
  label: string;
  value: string;
};

export type ProductRequiredSpecRow = ProductRequiredSpecEntry & {
  id: string;
  /** Kataloqda olmayan rənglər üçün vitrin swatch hex (#RRGGBB). */
  colorHex?: string | null;
};

const COLOR_HEX_SPEC_LABELS = new Set(
  ["rəng kodu", "color hex", "colorhex", "hex"].map((label) =>
    label.toLocaleLowerCase("az"),
  ),
);

export function isColorHexSpecLabel(label: string) {
  const normalized = label.trim().toLocaleLowerCase("az");
  return normalized !== "" && COLOR_HEX_SPEC_LABELS.has(normalized);
}

export function requiredSpecRowsToEntries(
  rows: ProductRequiredSpecRow[],
): ProductRequiredSpecEntry[] {
  const entries: ProductRequiredSpecEntry[] = [];

  for (const row of rows) {
    const label = row.label.trim();
    const value = row.value.trim();
    if (label === "" && value === "") {
      continue;
    }
    if (isColorHexSpecLabel(label)) {
      continue;
    }
    entries.push({ label: row.label, value: row.value });
  }

  const colorRow = rows.find(
    (row) => isColorSpecLabel(row.label) && row.colorHex?.trim(),
  );
  const colorHex = colorRow?.colorHex?.trim();
  if (colorHex !== undefined && colorHex !== "") {
    entries.push({ label: "Rəng kodu", value: colorHex });
  }

  return entries;
}

export function createEmptyRequiredSpecRow(): ProductRequiredSpecRow {
  return { id: crypto.randomUUID(), label: "", value: "" };
}

export const TEMPORARY_MEMORY_SPEC_LABEL = "Müvəqqəti yaddaş";

export function normalizeRequiredSpecLabel(label: string) {
  return label
    .trim()
    .toLocaleLowerCase("az")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ");
}

/** Daimi yaddaşdan fərqli RAM / müvəqqəti yaddaş başlıqları (köhnə «Operativ yaddaş» daxil). */
export function isTemporaryMemorySpecLabel(label: string) {
  const normalized = normalizeRequiredSpecLabel(label);
  if (normalized === "") {
    return false;
  }

  return (
    normalized.includes("ram") ||
    (normalized.includes("operativ") && normalized.includes("yadd")) ||
    normalized.includes("operativ memory") ||
    normalized.includes("operational memory") ||
    (normalized.includes("müvəqqəti") && normalized.includes("yadd")) ||
    (normalized.includes("muveqqeti") && normalized.includes("yadd"))
  );
}

export function isPermanentStorageSpecLabel(label: string) {
  if (isTemporaryMemorySpecLabel(label)) {
    return false;
  }

  const normalized = normalizeRequiredSpecLabel(label);
  if (normalized === "") {
    return false;
  }

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

const COLOR_SPEC_LABELS = new Set(
  ["rəng", "reng", "color", "renk"].map((label) =>
    label.toLocaleLowerCase("az"),
  ),
);

export function isColorSpecLabel(label: string) {
  const normalized = label.trim().toLocaleLowerCase("az");
  return normalized !== "" && COLOR_SPEC_LABELS.has(normalized);
}

export const METER_SPEC_LABEL = "Metr";

const METER_SPEC_LABELS = new Set(
  ["metr", "meter", "metre", "uzunluq", "length"].map((label) =>
    label.toLocaleLowerCase("az"),
  ),
);

export function isMeterSpecLabel(label: string) {
  const normalized = normalizeRequiredSpecLabel(label);
  return normalized !== "" && METER_SPEC_LABELS.has(normalized);
}

export const PORT_COUNT_SPEC_LABEL = "Port sayı";
export const POE_COUNT_SPEC_LABEL = "PoE sayı";
export const TRANSFER_SPEED_SPEC_LABEL = "Ötürmə sürəti";

export function isPortCountSpecLabel(label: string) {
  const normalized = normalizeRequiredSpecLabel(label);
  if (normalized === "") {
    return false;
  }

  return (
    normalized === "port" ||
    normalized.includes("port say") ||
    normalized.includes("port count") ||
    normalized.includes("ports")
  );
}

export function isPoeCountSpecLabel(label: string) {
  const normalized = normalizeRequiredSpecLabel(label);
  if (normalized === "") {
    return false;
  }

  return normalized.includes("poe");
}

export function isTransferSpeedSpecLabel(label: string) {
  const normalized = normalizeRequiredSpecLabel(label);
  if (normalized === "") {
    return false;
  }

  return (
    normalized === "sürət" ||
    normalized === "surət" ||
    normalized.includes("speed") ||
    normalized.includes("bandwidth") ||
    (normalized.includes("ötürmə") && normalized.includes("sür")) ||
    (normalized.includes("oturme") && normalized.includes("sur"))
  );
}

export function getRequiredSpecsSectionMessage(input: {
  parentCategoryId: string;
  hasSubcategories: boolean;
  subcategoryId: string;
}): string | null {
  const { parentCategoryId, hasSubcategories, subcategoryId } = input;

  if (parentCategoryId === "") {
    return "Kateqoriya seçdikdən sonra tələb olunan xüsusiyyətləri əlavə edə bilərsiniz.";
  }

  if (hasSubcategories && subcategoryId === "") {
    return "Alt kateqoriya seçin — sonra xüsusiyyət sətirlərini əlavə edin.";
  }

  return null;
}

export function isRequiredSpecsSectionReady(input: {
  parentCategoryId: string;
  hasSubcategories: boolean;
  subcategoryId: string;
}) {
  return getRequiredSpecsSectionMessage(input) === null;
}

export function normalizeRequiredSpecRows(
  rows: ProductRequiredSpecRow[],
): { entries: ProductRequiredSpecEntry[]; errors: string[] } {
  const errors: string[] = [];
  const entries: ProductRequiredSpecEntry[] = [];

  for (const row of rows) {
    const label = row.label.trim();
    const value = row.value.trim();

    if (label === "" && value === "") {
      continue;
    }

    if (isColorHexSpecLabel(label)) {
      continue;
    }

    if (label === "") {
      errors.push("Hər xüsusiyyət üçün başlıq daxil edin.");
      continue;
    }

    if (value === "") {
      errors.push(`"${label}" xüsusiyyəti üçün dəyər daxil edin.`);
      continue;
    }

    entries.push({ label, value });
  }

  const colorRowWithHex = rows.find(
    (row) => isColorSpecLabel(row.label) && row.colorHex?.trim(),
  );
  const persistedColorHex = colorRowWithHex?.colorHex?.trim();
  if (persistedColorHex !== undefined && persistedColorHex !== "") {
    entries.push({ label: "Rəng kodu", value: persistedColorHex });
  }

  return { entries, errors: [...new Set(errors)] };
}
