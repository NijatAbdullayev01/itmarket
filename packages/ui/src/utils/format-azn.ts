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
  const groupedWhole = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${sign}${groupedWhole},${fractionalPart} ₼`;
}

export function formatAznValue(
  value: string | number | null | undefined,
): string | null {
  const amount = parseAznAmount(value);
  return amount === null ? null : formatAzn(amount);
}
