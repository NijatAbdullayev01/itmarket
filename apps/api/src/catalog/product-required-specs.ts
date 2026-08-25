export type ProductRequiredSpecEntry = {
  label: string;
  value: string;
  labelRu?: string;
  valueRu?: string;
  labelEn?: string;
  valueEn?: string;
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

    if (label === '' || specValue === '') {
      continue;
    }

    const readText = (key: string): string | undefined => {
      const raw = record[key];
      return typeof raw === 'string' && raw.trim() !== ''
        ? raw.trim()
        : undefined;
    };

    const labelRu = readText('labelRu');
    const valueRu = readText('valueRu');
    const labelEn = readText('labelEn');
    const valueEn = readText('valueEn');

    entries.push({
      label,
      value: specValue,
      ...(labelRu !== undefined ? { labelRu } : {}),
      ...(valueRu !== undefined ? { valueRu } : {}),
      ...(labelEn !== undefined ? { labelEn } : {}),
      ...(valueEn !== undefined ? { valueEn } : {}),
    });
  }

  return entries;
}
