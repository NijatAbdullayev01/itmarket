export function parseCorsOrigins(value: string): string[] {
  const origins: string[] = [];
  const seen = new Set<string>();
  for (const part of value.split(',')) {
    const trimmed = part.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    origins.push(trimmed);
  }
  return origins;
}
