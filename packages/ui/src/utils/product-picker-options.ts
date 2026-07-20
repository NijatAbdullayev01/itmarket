export function mergeProductPickerOptions<
  T extends { value: string; available: number },
>(allOptions: readonly T[], availabilityOptions: readonly T[]): T[] {
  const availabilityByValue = new Map(
    availabilityOptions.map((option) => [option.value, option.available]),
  );

  return allOptions.map((option) => ({
    ...option,
    available: availabilityByValue.get(option.value) ?? 0,
  }));
}
