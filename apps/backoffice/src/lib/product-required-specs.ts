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

const BULK_SPEC_LABEL_MAX = 120;
const BULK_SPEC_VALUE_MAX = 500;

const BULK_SPEC_HEADER_LABELS = new Set(
  ["başlıq", "xüsusiyyət", "xüsusiyyətlər", "ad", "label", "name", "spec"].map(
    (label) => label.toLocaleLowerCase("az"),
  ),
);

const BULK_SPEC_HEADER_VALUES = new Set(
  ["dəyər", "value", "qiymət"].map((value) => value.toLocaleLowerCase("az")),
);

function clipBulkSpecLabel(label: string) {
  return label.trim().slice(0, BULK_SPEC_LABEL_MAX);
}

function clipBulkSpecValue(value: string) {
  return value.trim().slice(0, BULK_SPEC_VALUE_MAX);
}

function stripBulkSpecBullet(line: string) {
  return line
    .replace(/^[\s]*([•●○▪*·]|[-–—]|\d+[.)])\s+/u, "")
    .trim();
}

function splitBulkSpecLine(raw: string): ProductRequiredSpecEntry | null {
  const line = stripBulkSpecBullet(raw);
  if (line === "") {
    return null;
  }

  const tabIndex = line.indexOf("\t");
  if (tabIndex > 0) {
    const label = clipBulkSpecLabel(line.slice(0, tabIndex));
    const value = clipBulkSpecValue(line.slice(tabIndex + 1));
    if (label !== "" && value !== "") {
      return { label, value };
    }
  }

  const pipeIndex = line.indexOf(" | ");
  if (pipeIndex > 0) {
    const label = clipBulkSpecLabel(line.slice(0, pipeIndex));
    const value = clipBulkSpecValue(line.slice(pipeIndex + 3));
    if (label !== "" && value !== "") {
      return { label, value };
    }
  }

  const colonMatch = line.match(/^(.{1,120}?)[:：]\s*(.+)$/u);
  if (colonMatch?.[1] !== undefined && colonMatch[2] !== undefined) {
    const label = clipBulkSpecLabel(colonMatch[1]);
    const value = clipBulkSpecValue(colonMatch[2]);
    if (label !== "" && value !== "") {
      return { label, value };
    }
  }

  const dashMatch = line.match(/^(.{1,80}?)\s+[–—]\s+(.+)$/u);
  if (dashMatch?.[1] !== undefined && dashMatch[2] !== undefined) {
    const label = clipBulkSpecLabel(dashMatch[1]);
    const value = clipBulkSpecValue(dashMatch[2]);
    if (label !== "" && value !== "") {
      return { label, value };
    }
  }

  const hyphenMatch = line.match(/^(.{1,80}?)\s+-\s+(.+)$/u);
  if (hyphenMatch?.[1] !== undefined && hyphenMatch[2] !== undefined) {
    const label = clipBulkSpecLabel(hyphenMatch[1]);
    const value = clipBulkSpecValue(hyphenMatch[2]);
    if (label !== "" && value !== "") {
      return { label, value };
    }
  }

  return null;
}

function isBulkSpecHeaderRow(entry: ProductRequiredSpecEntry) {
  return (
    BULK_SPEC_HEADER_LABELS.has(entry.label.trim().toLocaleLowerCase("az")) &&
    BULK_SPEC_HEADER_VALUES.has(entry.value.trim().toLocaleLowerCase("az"))
  );
}

/** Excel, «Başlıq: Dəyər» və iki sətirlik cədvəl yapışdırmasını sətirlərə çevirir. */
export function parseBulkRequiredSpecText(
  text: string,
): ProductRequiredSpecEntry[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

  const entries: ProductRequiredSpecEntry[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const split = splitBulkSpecLine(lines[index]);
    if (split !== null) {
      entries.push(split);
      continue;
    }

    const nextLine = lines[index + 1];
    if (nextLine === undefined || splitBulkSpecLine(nextLine) !== null) {
      continue;
    }

    const label = clipBulkSpecLabel(stripBulkSpecBullet(lines[index]));
    const value = clipBulkSpecValue(stripBulkSpecBullet(nextLine));
    if (label !== "" && value !== "" && label.length <= 80) {
      entries.push({ label, value });
      index += 1;
    }
  }

  return entries.filter((entry) => !isBulkSpecHeaderRow(entry));
}

export const BULK_REQUIRED_SPEC_PARSE_ERROR =
  "Başlıq və dəyər cütü tapılmadı. Hər sətirdə «Başlıq: Dəyər» yazın və ya Excel-dən iki sütunu yapışdırın.";

export function applyBulkRequiredSpecEntries(
  current: ProductRequiredSpecRow[],
  entries: ProductRequiredSpecEntry[],
): ProductRequiredSpecRow[] {
  const colorHexEntry = entries.find((entry) =>
    isColorHexSpecLabel(entry.label),
  );
  const persistedColorHex = colorHexEntry?.value.trim() ?? "";
  const incoming = entries
    .filter((entry) => !isColorHexSpecLabel(entry.label))
    .map((entry) => {
      const label = clipBulkSpecLabel(entry.label);
      const value = clipBulkSpecValue(entry.value);
      return {
        id: crypto.randomUUID(),
        label,
        value,
        ...(isColorSpecLabel(label) && persistedColorHex !== ""
          ? { colorHex: persistedColorHex }
          : {}),
      } satisfies ProductRequiredSpecRow;
    })
    .filter((row) => row.label !== "" && row.value !== "");

  const result = current.map((row) => ({ ...row }));
  const usedIndexes = new Set<number>();

  for (const next of incoming) {
    const labelKey = normalizeRequiredSpecLabel(next.label);
    const matchIndex = result.findIndex(
      (row, index) =>
        !usedIndexes.has(index) &&
        row.label.trim() !== "" &&
        normalizeRequiredSpecLabel(row.label) === labelKey,
    );

    if (matchIndex >= 0) {
      const matched = result[matchIndex];
      if (matched !== undefined) {
        result[matchIndex] = {
          ...matched,
          value: next.value,
          ...(next.colorHex !== undefined ? { colorHex: next.colorHex } : {}),
        };
        usedIndexes.add(matchIndex);
      }
      continue;
    }

    const emptyIndex = result.findIndex(
      (row, index) =>
        !usedIndexes.has(index) &&
        row.label.trim() === "" &&
        row.value.trim() === "",
    );

    if (emptyIndex >= 0) {
      const emptyRow = result[emptyIndex];
      if (emptyRow !== undefined) {
        result[emptyIndex] = {
          ...emptyRow,
          label: next.label,
          value: next.value,
          ...(next.colorHex !== undefined ? { colorHex: next.colorHex } : {}),
        };
        usedIndexes.add(emptyIndex);
      }
      continue;
    }

    result.push(next);
  }

  if (persistedColorHex !== "") {
    const colorIndex = result.findIndex((row) => isColorSpecLabel(row.label));
    const colorRow = colorIndex >= 0 ? result[colorIndex] : undefined;
    if (colorRow !== undefined && (colorRow.colorHex?.trim() ?? "") === "") {
      result[colorIndex] = { ...colorRow, colorHex: persistedColorHex };
    }
  }

  return result;
}

export function applyBulkRequiredSpecText(
  current: ProductRequiredSpecRow[],
  text: string,
): {
  rows: ProductRequiredSpecRow[];
  appliedCount: number;
  error: string | null;
} {
  const entries = parseBulkRequiredSpecText(text);
  if (entries.length === 0) {
    return {
      rows: current,
      appliedCount: 0,
      error: BULK_REQUIRED_SPEC_PARSE_ERROR,
    };
  }

  return {
    rows: applyBulkRequiredSpecEntries(current, entries),
    appliedCount: entries.filter((entry) => !isColorHexSpecLabel(entry.label))
      .length,
    error: null,
  };
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

/** Variant intro: Rəng / yaddaş yalnız smartfon-planşet kateqoriyasında. */
export function getRequiredSpecsVariantIntroMessage(input: {
  includeInitialVariant: boolean;
  supportsPhoneTabletVariantAttributes: boolean;
}) {
  if (!input.includeInitialVariant) {
    return "Hər sətirdə başlıq və dəyər daxil edin. Mağaza kartında və SKU variantında istifadə olunacaq.";
  }

  if (input.supportsPhoneTabletVariantAttributes) {
    return `Hər sətirdə başlıq və dəyər daxil edin. «Rəng», «Daimi yaddaş», «${TEMPORARY_MEMORY_SPEC_LABEL}», «${METER_SPEC_LABEL}», «Port», «PoE+» və «Sürət» SKU və variant atributları üçün istifadə olunur. Rəng və yaddaş yalnız telefon və planşet üçündür (aksesuarlar deyil).`;
  }

  return `Hər sətirdə başlıq və dəyər daxil edin. «${METER_SPEC_LABEL}», «Port», «PoE+» və «Sürət» SKU və variant atributları üçün istifadə olunur. «Rəng», «Daimi yaddaş» və «${TEMPORARY_MEMORY_SPEC_LABEL}» yalnız telefon və planşet kateqoriyasında variant olur.`;
}

export function getRequiredSpecLabelPlaceholder(
  supportsPhoneTabletVariantAttributes: boolean,
) {
  if (supportsPhoneTabletVariantAttributes) {
    return `Məs: ${TEMPORARY_MEMORY_SPEC_LABEL}, Rəng, Port və ya ${METER_SPEC_LABEL}`;
  }
  return `Məs: Port, PoE+ və ya ${METER_SPEC_LABEL}`;
}

export function isPhoneTabletVariantSpecLabel(label: string) {
  return (
    isColorSpecLabel(label) ||
    isColorHexSpecLabel(label) ||
    isPermanentStorageSpecLabel(label) ||
    isTemporaryMemorySpecLabel(label)
  );
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
      if (
        isPermanentStorageSpecLabel(label) ||
        isTemporaryMemorySpecLabel(label)
      ) {
        continue;
      }
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
