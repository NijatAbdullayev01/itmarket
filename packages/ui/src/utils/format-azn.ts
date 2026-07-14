const aznFormatter = new Intl.NumberFormat("az-AZ", {
  style: "currency",
  currency: "AZN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatAzn(amount: number): string {
  if (!Number.isFinite(amount)) {
    throw new TypeError("Məbləğ sonlu ədəd olmalıdır.");
  }

  return aznFormatter.format(amount);
}
