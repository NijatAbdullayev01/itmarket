/**
 * Vertiv UPS catalog names: brand + Liebert series + capacity (or accessory type).
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 */

const VERTIV_CATALOG_NAMES: Record<string, string> = {
  'GXE3-3000IRT2UXL': 'Vertiv Liebert GXE3 3kVA 230V',
  'GXT5-6000IRT5UXLN': 'Vertiv Liebert GXT5 6kVA 230V',
  'GXT5-10KIRT5UXLN': 'Vertiv Liebert GXT5 10kVA 230V',
  'GXT5-10KIRT5UXLE': 'Vertiv Liebert GXT5 10kVA 230V E',
  RDU101: 'Vertiv Liebert IntelliSlot RDU101 kartı',
  RDU120: 'Vertiv Liebert IntelliSlot RDU120 kartı',
  'IS-UNITY-SNMP': 'Vertiv Liebert IntelliSlot Unity SNMP kartı',
  LI38000B020: 'Vertiv Liebert GXT-MT+/RT+ SNMP kartı',
  'RMKIT18-32': 'Vertiv Liebert GXT5 rack slide kit 18–32"',
  'GXT5-5000IRT5UXLN': 'Vertiv Liebert GXT5 5kVA 230V',
  'GXTRT-1500IRT2UXL': 'Vertiv Liebert GXT RT+ 1.5kVA',
  LI32111CT00: 'Vertiv Liebert itON 600VA',
  LI32121CT00: 'Vertiv Liebert itON 800VA',
};

export function normalizeVertivSku(model: string): string {
  return model
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9._-]+/g, '')
    .slice(0, 64);
}

export function listVertivCatalogNameSkus(): string[] {
  return Object.keys(VERTIV_CATALOG_NAMES);
}

export function resolveVertivCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const catalogName = VERTIV_CATALOG_NAMES[normalizeVertivSku(sku)];
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
