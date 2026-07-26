/** Baku local time — Azərbaycan UI tarixləri üçün vahid timezone. */
export const AZ_DATE_TIMEZONE = "Asia/Baku";

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function toValidDate(value: string | number | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const trimmed = value.trim();
  if (trimmed === "") return null;

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function partsLookup(
  date: Date,
  options: Intl.DateTimeFormatOptions,
): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: AZ_DATE_TIMEZONE,
    ...options,
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

/**
 * Azərbaycan UI tarixi: DD.MM.YYYY (Asia/Baku).
 * ISO `YYYY-MM-DD` kalendar günü timezone sürüşməsi olmadan göstərilir.
 * `month: "long"` / `toLocaleDateString("az-AZ")` istifadə etmə — bəzi brauzerlərdə "M07" kimi xarab çıxır.
 */
export function formatAzDate(
  value: string | number | Date | null | undefined,
  fallback = "",
): string {
  if (value === null || value === undefined) return fallback;

  if (typeof value === "string") {
    const dateOnly = DATE_ONLY_RE.exec(value.trim());
    if (dateOnly) {
      const [, year, month, day] = dateOnly;
      return `${day}.${month}.${year}`;
    }
  }

  const date = toValidDate(value);
  if (!date) return fallback;

  const lookup = partsLookup(date, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const day = lookup.day;
  const month = lookup.month;
  const year = lookup.year;
  if (!day || !month || !year) return fallback;

  return `${day}.${month}.${year}`;
}

/**
 * Azərbaycan UI tarix-saatı: DD.MM.YYYY, HH:mm (Asia/Baku, 24 saat).
 */
export function formatAzDateTime(
  value: string | number | Date | null | undefined,
  fallback = "",
): string {
  if (value === null || value === undefined) return fallback;

  const date = toValidDate(value);
  if (!date) return fallback;

  const lookup = partsLookup(date, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const day = lookup.day;
  const month = lookup.month;
  const year = lookup.year;
  const hour = lookup.hour;
  const minute = lookup.minute;
  if (!day || !month || !year || !hour || !minute) return fallback;

  return `${day}.${month}.${year}, ${hour}:${minute}`;
}
