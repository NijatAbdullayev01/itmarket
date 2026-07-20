export type ProductRequiredSpecEntry = {
  label: string;
  value: string;
};

export function parseProductRequiredSpecs(
  value: unknown,
): ProductRequiredSpecEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const entries: ProductRequiredSpecEntry[] = [];
  for (const item of value) {
    if (item === null || typeof item !== 'object') {
      continue;
    }

    const record = item as Record<string, unknown>;
    const label = typeof record.label === 'string' ? record.label.trim() : '';
    const specValue =
      typeof record.value === 'string' ? record.value.trim() : '';

    if (label === '' && specValue === '') {
      continue;
    }

    if (label === '' || specValue === '') {
      continue;
    }

    entries.push({ label, value: specValue });
  }

  return entries;
}
