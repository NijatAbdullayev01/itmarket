export function parseAznAmount(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : null;
}

export function formatAzn(amount: number): string {
  if (!Number.isFinite(amount)) {
    throw new TypeError("Məbləğ sonlu ədəd olmalıdır.");
  }

  const sign = amount < 0 ? "-" : "";
  const absolute = Math.abs(amount);
  const [wholePart, fractionalPart = "00"] = absolute.toFixed(2).split(".");
  // ≤999: always two decimals (999.00). ≥1000: no thousand grouping; qəpik only when non-zero (1000.99 / 1000).
  const amountPart =
    absolute < 1000 || fractionalPart !== "00"
      ? `${wholePart}.${fractionalPart}`
      : wholePart;

  return `${sign}${amountPart} ₼`;
}

/**
 * Tight manat for badges/chips. Whole amounts omit qəpik (44 ₼, not 44.00 ₼).
 */
export function formatAznCompact(amount: number): string {
  if (!Number.isFinite(amount)) {
    throw new TypeError("Məbləğ sonlu ədəd olmalıdır.");
  }

  const sign = amount < 0 ? "-" : "";
  const absolute = Math.abs(amount);
  const roundedToQepik = Math.round(absolute * 100) / 100;
  const whole = Math.round(roundedToQepik);
  if (Math.abs(roundedToQepik - whole) < 0.001) {
    return `${sign}${whole} ₼`;
  }

  return formatAzn(amount);
}

export function formatAznValue(
  value: string | number | null | undefined,
): string | null {
  const amount = parseAznAmount(value);
  return amount === null ? null : formatAzn(amount);
}

/** Listed catalog price; missing or non-positive amounts are treated as unlisted. */
export function formatListedAznValue(
  value: string | number | null | undefined,
): string | null {
  const amount = parseAznAmount(value);
  if (amount === null || amount <= 0) {
    return null;
  }
  return formatAzn(amount);
}
