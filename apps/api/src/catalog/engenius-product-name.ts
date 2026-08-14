/**
 * EnGenius catalog names: brand + model + port/PoE summary.
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 */

const ENGENIUS_CATALOG_NAMES: Record<string, string> = {
  'EWS1200-28TFP': 'EnGenius EWS1200-28TFP 24-port PoE+ kommutator',
  ECS1528P: 'EnGenius ECS1528P 24-port PoE+ kommutator',
  ECS1552: 'EnGenius ECS1552 48-port kommutator',
  EWS7928P: 'EnGenius EWS7928P 24-port PoE+ kommutator',
};

export function listEnGeniusCatalogNameSkus(): string[] {
  return Object.keys(ENGENIUS_CATALOG_NAMES);
}

export function resolveEnGeniusCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const catalogName = ENGENIUS_CATALOG_NAMES[sku.trim().toUpperCase()];
  if (catalogName !== undefined) {
    return catalogName;
  }
  const trimmed = fallbackTitle.trim();
  if (/^engenius\b/i.test(trimmed)) {
    return trimmed;
  }
  return `EnGenius ${trimmed}`.trim();
}
