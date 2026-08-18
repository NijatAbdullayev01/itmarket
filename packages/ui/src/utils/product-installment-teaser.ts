import { formatAzn, parseAznAmount } from "./format-azn";

export const DEFAULT_INSTALLMENT_MONTHS = [6, 12, 18, 24] as const;

export type ProductInstallmentTeaser = {
  months: number;
  monthlyAmountFormatted: string;
};

export function getProductInstallmentPlans(
  price: string | number | null | undefined,
  installmentMonths: readonly number[] = DEFAULT_INSTALLMENT_MONTHS,
): ProductInstallmentTeaser[] {
  const amount = parseAznAmount(price);
  if (amount === null || amount <= 0) {
    return [];
  }

  const availableMonths = [
    ...new Set(installmentMonths.filter((months) => Number.isInteger(months) && months > 0)),
  ].sort((left, right) => left - right);

  return availableMonths.map((months) => ({
    months,
    monthlyAmountFormatted: formatAzn(amount / months),
  }));
}

export function getProductInstallmentTeaser(
  price: string | number | null | undefined,
  installmentMonths: readonly number[] = DEFAULT_INSTALLMENT_MONTHS,
): ProductInstallmentTeaser | null {
  const plans = getProductInstallmentPlans(price, installmentMonths);
  return plans[plans.length - 1] ?? null;
}
