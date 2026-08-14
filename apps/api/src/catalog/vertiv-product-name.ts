/**
 * Vertiv UPS catalog names: brand + Liebert series + capacity (or accessory type).
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 */

const VERTIV_CATALOG_NAMES: Record<string, string> = {
  'GXT5-5000IRT5UXLN': 'Vertiv Liebert GXT5 5kVA 230V',
  'GXTRT-1500IRT2UXL': 'Vertiv Liebert GXT RT+ 1.5kVA',
  LI32111CT00: 'Vertiv Liebert itON 600VA',
  LI32121CT00: 'Vertiv Liebert itON 800VA',
  LI38000B020: 'Vertiv Liebert GXT-MT+ SNMP kartı',
  RDU101: 'Vertiv Liebert IntelliSlot RDU101 kartı',
};

export function listVertivCatalogNameSkus(): string[] {
  return Object.keys(VERTIV_CATALOG_NAMES);
}

export function resolveVertivCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const catalogName = VERTIV_CATALOG_NAMES[sku.trim().toUpperCase()];
  if (catalogName !== undefined) {
    return catalogName;
  }
  const trimmed = fallbackTitle.trim();
  if (/^vertiv\b/i.test(trimmed)) {
    return trimmed;
  }
  if (/^liebert\b/i.test(trimmed)) {
    return `Vertiv ${trimmed}`;
  }
  return `Vertiv ${trimmed}`.trim();
}
