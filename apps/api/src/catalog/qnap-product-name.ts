/**
 * QNAP catalog names: brand + marketing model + short type.
 * Compact codes (TS-*, QSW-*, KOIBOX-*) stay in Part number, not product.name.
 */

export type QnapNameSpec = {
  label: string;
  value: string;
};

const QNAP_SKU_ALIASES: Record<string, string> = {
  'QXG-2G2T-1225': 'QXG-2G2T-I225',
  '72123800-6051100-000-RS': 'ST8000VN004',
  'TS-832PXU-4G-EU': 'TS-832PXU-4G',
};

const QNAP_CATALOG_NAMES: Record<string, string> = {
  'RAIL-A02-90': 'QNAP RAIL-A02-90 rack rels',
  'QSW-1105-5T': 'QNAP QSW-1105-5T 5-port 2.5GbE kommutator',
  'QSW-1108-8T': 'QNAP QSW-1108-8T 8-port 2.5GbE kommutator',
  'TR-002': 'QNAP TR-002 2-bay USB DAS',
  'TR-004': 'QNAP TR-004 4-bay USB DAS',
  'TS-133': 'QNAP TS-133 1-bay NAS',
  'TS-216G': 'QNAP TS-216G 2-bay NAS',
  'TS-233': 'QNAP TS-233 2-bay NAS',
  'TS-264-8G': 'QNAP TS-264-8G 2-bay NAS',
  'TS-364-8G': 'QNAP TS-364-8G 3-bay NAS',
  'TS-433-4G': 'QNAP TS-433-4G 4-bay NAS',
  'TS-453E-8G': 'QNAP TS-453E-8G 4-bay NAS',
  'TS-464-8G': 'QNAP TS-464-8G 4-bay NAS',
  'TS-473A-8G': 'QNAP TS-473A-8G 4-bay NAS',
  'TS-AI642-8G': 'QNAP TS-AI642-8G 6-bay AI NAS',
  'TS-632X-4G': 'QNAP TS-632X-4G 6-bay NAS',
  'TS-664-8G': 'QNAP TS-664-8G 6-bay NAS',
  'TS-673A-8G': 'QNAP TS-673A-8G 6-bay NAS',
  'TS-832PX-4G': 'QNAP TS-832PX-4G 8-bay NAS',
  'TS-873A-8G': 'QNAP TS-873A-8G 8-bay NAS',
  'TS-432PXU-2G': 'QNAP TS-432PXU-2G 4-bay rack NAS',
  'TS-432PXU-RP-2G': 'QNAP TS-432PXU-RP-2G 4-bay rack NAS',
  'TS-464EU-8G': 'QNAP TS-464eU-8G 4-bay 1U rack NAS',
  'TS-464U-RP-8G': 'QNAP TS-464U-RP-8G 4-bay 1U rack NAS',
  'TS-832PXU-4G': 'QNAP TS-832PXU-4G 8-bay rack NAS',
  'TS-832PXU-RP-4G': 'QNAP TS-832PXU-RP-4G 8-bay rack NAS',
  'TS-864EU-RP-8G': 'QNAP TS-864eU-RP-8G 8-bay 2U rack NAS',
  'TS-873AEU-4G': 'QNAP TS-873AeU-4G 8-bay rack NAS',
  'TS-873AEU-RP-4G': 'QNAP TS-873AeU-RP-4G 8-bay rack NAS',
  'TS-855EU-RP-8G': 'QNAP TS-855eU-RP-8G 8-bay rack NAS',
  'TS-1232PXU-RP-4G': 'QNAP TS-1232PXU-RP-4G 12-bay rack NAS',
  'TS-1264U-RP-8G': 'QNAP TS-1264U-RP-8G 12-bay rack NAS',
  'TS-1273AU-RP-8G': 'QNAP TS-1273AU-RP-8G 12-bay rack NAS',
  'TS-1273AU-RP-8GB': 'QNAP TS-1273AU-RP-8GB 12-bay rack NAS',
  'TS-H1277AXU-RP-R5-16G': 'QNAP TS-h1277AXU-RP-R5-16G 12-bay rack NAS',
  'TS-H1277AXU-RP-R7-32G': 'QNAP TS-h1277AXU-RP-R7-32G 12-bay rack NAS',
  'TS-H1677AXU-RP-R7-32G': 'QNAP TS-h1677AXU-RP-R7-32G 16-bay rack NAS',
  'TS-H1887XU-RP-E2334-16G': 'QNAP TS-h1887XU-RP-E2334-16G 18-bay rack NAS',
  'TRX-10GITSFPP-SR': 'QNAP TRX-10GITSFPP-SR 10GbE SFP+ transceiver',
  'TRX-25GSFP28-SR': 'QNAP TRX-25GSFP28-SR 25GbE SFP28 transceiver',
  'QXG-10G1T': 'QNAP QXG-10G1T 10GbE adapter',
  'QXG-25G2SF-E810': 'QNAP QXG-25G2SF-E810 25GbE adapter',
  'QXG-2G2T-I225': 'QNAP QXG-2G2T-I225 2.5GbE adapter',
  'QM2-2P-244A': 'QNAP QM2-2P-244A M.2 NVMe kart',
  'QM2-2P-344A': 'QNAP QM2-2P-344A M.2 NVMe kart',
  'QM2-2P-384A': 'QNAP QM2-2P-384A M.2 NVMe kart',
  'QXG-10G2SF-X710': 'QNAP QXG-10G2SF-X710 10GbE adapter',
  'QNA-UC10G1T': 'QNAP QNA-UC10G1T USB4 10GbE adapter',
  'QSW-M2106-4C': 'QNAP QSW-M2106-4C 10-port kommutator',
  'QSW-M1204-4C': 'QNAP QSW-M1204-4C 10GbE kommutator',
  'QSW-M408-4C': 'QNAP QSW-M408-4C kommutator',
  'KOIBOX-100W': 'QNAP KoiBox-100W konfrans kamerası',
  'TS-435XEU-4G': 'QNAP TS-435XeU-4G 4-bay rack NAS',
  'RAIL-B02': 'QNAP RAIL-B02 rack rels',
  '7212324T-7050000-000-RS': 'QNAP IronWolf 24TB NAS',
  '72123400-6000000-000-RS': 'QNAP IronWolf 4TB NAS',
  ST8000VN004: 'QNAP IronWolf 8TB NAS',
};

export function normalizeQnapSku(model: string): string {
  const normalized = model
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return QNAP_SKU_ALIASES[normalized] ?? normalized;
}

/** Compact QNAP codes such as TS-233 / QSW-M408-4C (no spaces, has a digit). */
export function isQnapCompactCodeName(value: string): boolean {
  const token = value.trim();
  if (token === '' || /\s/.test(token)) {
    return false;
  }
  return /\d/.test(token) && token.length <= 40;
}

export function ensureQnapPartNumberSpec(
  specs: readonly QnapNameSpec[],
  partNumber: string,
): QnapNameSpec[] {
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

export function listQnapCatalogNameSkus(): string[] {
  return Object.keys(QNAP_CATALOG_NAMES);
}

export function resolveQnapCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const catalogName = QNAP_CATALOG_NAMES[normalizeQnapSku(sku)];
  if (catalogName !== undefined) {
    return catalogName;
  }
  const trimmed = fallbackTitle.trim();
  if (trimmed === '' || isQnapCompactCodeName(trimmed)) {
    return `QNAP ${normalizeQnapSku(sku)}`;
  }
  if (/^qnap\b/i.test(trimmed)) {
    return trimmed;
  }
  return `QNAP ${trimmed}`.trim();
}
