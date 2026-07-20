export type VariantOptionAvailability = {
  value: string;
  available: number;
};

/** Pick option value for variant matrix; drops current choice when it is unavailable. */
export function pickVariantOptionValue(
  options: readonly VariantOptionAvailability[],
  current: string | null,
): string | null {
  if (
    current !== null &&
    options.some(
      (option) => option.value === current && option.available > 0,
    )
  ) {
    return current;
  }

  return (
    options.find((option) => option.available > 0)?.value ??
    options[0]?.value ??
    null
  );
}
