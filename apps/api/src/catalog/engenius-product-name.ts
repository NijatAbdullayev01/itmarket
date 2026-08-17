/**
 * EnGenius catalog names: brand + model + short type (port/Wi-Fi/role).
 * Compact codes (ECS1552) stay in Part number / Model, not product.name.
 */

export type EnGeniusNameSpec = {
  label: string;
  value: string;
};

const ENGENIUS_SKU_ALIASES: Record<string, string> = {
  'ECW-120': 'ECW120',
  'ECW120 - CEILING MOUNT': 'ECW120',
  'ECW-215': 'ECW215',
  'ECW215 - WALLPLATE AX': 'ECW215',
  'ECW-160': 'ECW160',
  'ECW160 - OUTDOOR': 'ECW160',
  'ECW-220': 'ECW220',
  'ECW-260': 'ECW260',
  'ECW-336': 'ECW336',
  'ECW130 - CEILING MOUNT': 'ECW130',
  'ECW230 - CEILING MOUNT AX': 'ECW230',
  'ECW220S - CEILING MOUNT': 'ECW220S',
  'EWS-357-FIT': 'EWS357-FIT',
  'EWS-356-FIT': 'EWS356-FIT',
  'EWS356AP-FIT': 'EWS356-FIT',
  'EWS-377': 'EWS377-FIT',
  'EWS377AP-FIT': 'EWS377AP',
  'EWS357AP-FIT': 'EWS357AP',
  'EWS850AP-FIT': 'EWS850-FIT',
  FITCON100: 'FITCON100',
};

const ENGENIUS_CATALOG_NAMES: Record<string, string> = {
  ECS1008P: 'EnGenius ECS1008P 8-port PoE+ Cloud kommutator',
  ECS1112FP: 'EnGenius ECS1112FP 8-port PoE+ Cloud kommutator',
  ECS1528P: 'EnGenius ECS1528P 24-port PoE+ Cloud kommutator',
  ECS1528FP: 'EnGenius ECS1528FP 24-port PoE+ Cloud kommutator',
  ECS1552: 'EnGenius ECS1552 48-port Cloud kommutator',
  ECS1552P: 'EnGenius ECS1552P 48-port PoE+ Cloud kommutator',
  ECS2552FP: 'EnGenius ECS2552FP 48-port Multi-Gig PoE+ Cloud kommutator',
  ECS1552FP: 'EnGenius ECS1552FP 48-port PoE+ Cloud kommutator',
  ECS5512F: 'EnGenius ECS5512F 12-port 10G SFP+ Cloud kommutator',
  'SFP2213-10': 'EnGenius SFP2213-10 1.25G LX 10 km SFP modul',
  ECW120: 'EnGenius ECW120 Wi-Fi 5 Cloud Access Point',
  'EWS357-FIT': 'EnGenius EWS357-FIT Wi-Fi 6 Fit Access Point',
  ECW215: 'EnGenius ECW215 Wi-Fi 6 wall-plate Cloud Access Point',
  'EWS356-FIT': 'EnGenius EWS356-FIT Wi-Fi 6 Fit Access Point',
  EWS357AP: 'EnGenius EWS357AP Wi-Fi 6 Neutron Access Point',
  ECW160: 'EnGenius ECW160 Wi-Fi 5 outdoor Cloud Access Point',
  ECW130: 'EnGenius ECW130 Wi-Fi 5 4×4 Cloud Access Point',
  ECW220: 'EnGenius ECW220 Wi-Fi 6 Cloud Access Point',
  'EWS377-FIT': 'EnGenius EWS377-FIT Wi-Fi 6 4×4 Fit Access Point',
  ENH1350EXT: 'EnGenius ENH1350EXT Wi-Fi 5 outdoor Access Point',
  ECW260: 'EnGenius ECW260 Wi-Fi 6 outdoor Cloud Access Point',
  EWS377AP: 'EnGenius EWS377AP Wi-Fi 6 4×4 Neutron Access Point',
  'EWS850-FIT': 'EnGenius EWS850-FIT Wi-Fi 6 outdoor Fit Access Point',
  'EWS1200-28TFP': 'EnGenius EWS1200-28TFP 24-port PoE+ kommutator',
  EWS7928P: 'EnGenius EWS7928P 24-port Neutron PoE+ kommutator',
  'EWS7928P-FIT': 'EnGenius EWS7928P-FIT 24-port PoE+ Fit kommutator',
  ECW230: 'EnGenius ECW230 Wi-Fi 6 4×4 Cloud Access Point',
  ECW336: 'EnGenius ECW336 Wi-Fi 6E 4×4 Cloud Access Point',
  ECW220S: 'EnGenius ECW220S Wi-Fi 6 Cloud Access Point (security)',
  'EWS7928FP-FIT': 'EnGenius EWS7928FP-FIT 24-port PoE+ Fit kommutator',
  'EWS7952FP-FIT': 'EnGenius EWS7952FP-FIT 48-port PoE+ Fit kommutator',
  ESG510: 'EnGenius ESG510 Cloud SD-WAN gateway',
  FITCON100: 'EnGenius FitController (FitCon100) idarəetmə platforması',
};

export function normalizeEnGeniusSku(model: string): string {
  const folded = model.trim().toUpperCase().replace(/\s+/g, ' ');
  const aliased = ENGENIUS_SKU_ALIASES[folded];
  if (aliased !== undefined) {
    return aliased;
  }
  return folded
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9._-]+/g, '')
    .slice(0, 64);
}

/** Compact EnGenius codes such as ECS1552 / EWS7928P (no spaces, has a digit). */
export function isEnGeniusCompactCodeName(value: string): boolean {
  const token = value.trim();
  if (token === '' || /\s/.test(token)) {
    return false;
  }
  return /\d/.test(token) && token.length <= 40;
}

export function ensureEnGeniusPartNumberSpec(
  specs: readonly EnGeniusNameSpec[],
  partNumber: string,
): EnGeniusNameSpec[] {
  const code = partNumber.trim();
  if (code === '') {
    return specs.map((entry) => ({ ...entry }));
  }
  let replaced = false;
  const next = specs.map((entry) => {
    const label = entry.label.toLocaleLowerCase('az');
    if (label !== 'part number' && label !== 'part nömrəsi') {
      return { ...entry };
    }
    replaced = true;
    return { label: 'Part number', value: code };
  });
  if (!replaced) {
    next.unshift({ label: 'Part number', value: code });
  }
  return next;
}

export function listEnGeniusCatalogNameSkus(): string[] {
  return Object.keys(ENGENIUS_CATALOG_NAMES);
}

export function resolveEnGeniusCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const catalogName = ENGENIUS_CATALOG_NAMES[normalizeEnGeniusSku(sku)];
  if (catalogName !== undefined) {
    return catalogName;
  }
  const trimmed = fallbackTitle.trim();
  if (trimmed === '' || isEnGeniusCompactCodeName(trimmed)) {
    return `EnGenius ${normalizeEnGeniusSku(sku)}`;
  }
  if (/^engenius\b/i.test(trimmed)) {
    return trimmed;
  }
  return `EnGenius ${trimmed}`.trim();
}
