import { formatAzn, parseAznAmount } from "./format-azn";

export const DEFAULT_INSTALLMENT_MONTHS = [6, 12, 18, 24] as const;

export type ProductInstallmentTeaser = {
  months: number;
  monthlyAmountFormatted: string;
};

export function getProductInstallmentTeaser(
  price: string | number | null | undefined,
  installmentMonths: readonly number[] = DEFAULT_INSTALLMENT_MONTHS,
): ProductInstallmentTeaser | null {
  const amount = parseAznAmount(price);
  if (amount === null || amount <= 0) {
    return null;
  }

  const availableMonths = installmentMonths.filter((months) => months > 0);
  if (availableMonths.length === 0) {
    return null;
  }

  const months = availableMonths[availableMonths.length - 1]!;
  const monthlyAmount = amount / months;

  return {
    months,
    monthlyAmountFormatted: formatAzn(monthlyAmount),
  };
}
