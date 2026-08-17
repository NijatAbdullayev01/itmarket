/**
 * Fortinet catalog names: brand + family + model + short type.
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 */

const FORTINET_SKU_ALIASES: Record<string, string> = {
  'FN-TRAN-SFP+LR': 'FN-TRAN-SFP-LR',
  'FN-TRAN-SFP+SR': 'FN-TRAN-SFP-SR',
  'FN-CABLE-SFP+1': 'FN-CABLE-SFP-1',
  'FN-CABLE-SFP+3': 'FN-CABLE-SFP-3',
};

const FORTINET_CATALOG_NAMES: Record<string, string> = {
  'FS-108F': 'Fortinet FortiSwitch 108F 8-port fanless kommutator',
  'FS-108F-FPOE': 'Fortinet FortiSwitch 108F-FPOE 8-port Full PoE+ kommutator',
  'FS-108F-POE': 'Fortinet FortiSwitch 108F-POE 8-port PoE+ kommutator',
  'FS-110G-FPOE': 'Fortinet FortiSwitch 110G-FPOE Multi-Gig PoE-bt kommutator',
  'FS-124F': 'Fortinet FortiSwitch 124F 24-port kommutator',
  'FS-124F-FPOE': 'Fortinet FortiSwitch 124F-FPOE 24-port Full PoE+ kommutator',
  'FS-124F-POE': 'Fortinet FortiSwitch 124F-POE 24-port PoE+ kommutator',
  'FS-148F': 'Fortinet FortiSwitch 148F 48-port kommutator',
  'FS-148F-FPOE': 'Fortinet FortiSwitch 148F-FPOE 48-port Full PoE+ kommutator',
  'FS-148F-POE': 'Fortinet FortiSwitch 148F-POE 48-port PoE+ kommutator',
  'FS-224D-FPOE': 'Fortinet FortiSwitch 224D-FPOE 24-port Full PoE+ kommutator',
  'FS-224E': 'Fortinet FortiSwitch 224E 24-port L2/3 kommutator',
  'FS-224E-POE': 'Fortinet FortiSwitch 224E-POE 24-port PoE+ kommutator',
  'FS-248E-FPOE': 'Fortinet FortiSwitch 248E-FPOE 48-port Full PoE+ kommutator',
  'FS-248E-POE': 'Fortinet FortiSwitch 248E-POE 48-port PoE+ kommutator',
  'FS-448E-POE': 'Fortinet FortiSwitch 448E-POE 48-port campus kommutator',
  'FS-424E': 'Fortinet FortiSwitch 424E 24-port campus kommutator',
  'FON-380': 'Fortinet FortiFone 380 3.5" IP masa telefonu',
  'FON-480': 'Fortinet FortiFone 480 4.3" IP masa telefonu',
  'FON-580': 'Fortinet FortiFone 580 triple-screen IP telefon',
  'FON-C71': 'Fortinet FortiFone C71 HD IP konfrans telefonu',
  'FG-30G': 'Fortinet FortiGate 30G desktop NGFW',
  'FWF-30G-E': 'Fortinet FortiWiFi 30G desktop NGFW',
  'FG-40F': 'Fortinet FortiGate 40F desktop NGFW',
  'FG-40F-3G4G': 'Fortinet FortiGate 40F-3G4G LTE desktop NGFW',
  'FG-50G': 'Fortinet FortiGate 50G desktop NGFW',
  'FG-50G-SFP': 'Fortinet FortiGate 50G-SFP desktop NGFW',
  'FG-51G': 'Fortinet FortiGate 51G desktop NGFW',
  'FG-51G-SFP-POE': 'Fortinet FortiGate 51G-SFP-PoE desktop NGFW',
  'FG-60F': 'Fortinet FortiGate 60F desktop NGFW',
  'FG-61F': 'Fortinet FortiGate 61F desktop NGFW',
  'FG-70G': 'Fortinet FortiGate 70G desktop NGFW',
  'FG-71G': 'Fortinet FortiGate 71G desktop NGFW',
  'FG-80F': 'Fortinet FortiGate 80F desktop NGFW',
  'FG-81F': 'Fortinet FortiGate 81F desktop NGFW',
  'FG-90G': 'Fortinet FortiGate 90G desktop NGFW',
  'FG-91G': 'Fortinet FortiGate 91G desktop NGFW',
  'FG-100F': 'Fortinet FortiGate 100F 1U NGFW',
  'FG-100F-LENC': 'Fortinet FortiGate 100F-LENC 1U NGFW',
  'FG-101F': 'Fortinet FortiGate 101F 1U NGFW',
  'FG-120G': 'Fortinet FortiGate 120G 1U NGFW',
  'FG-121G': 'Fortinet FortiGate 121G 1U NGFW',
  'FG-121G-LENC': 'Fortinet FortiGate 121G-LENC 1U NGFW',
  'FVE-100E': 'Fortinet FortiVoice 100E IP PBX',
  'FVE-20E4': 'Fortinet FortiVoice 20E4 IP PBX',
  'FVE-50E6': 'Fortinet FortiVoice 50E6 IP PBX',
  'FAP-231F-E': 'Fortinet FortiAP 231F Wi-Fi 6 Access Point',
  'FAP-231G-E': 'Fortinet FortiAP 231G Wi-Fi 6E Access Point',
  'FAP-231K-E': 'Fortinet FortiAP 231K Wi-Fi 7 Access Point',
  'FAP-221E-E': 'Fortinet FortiAP 221E Wi-Fi 5 Access Point',
  'FN-TRAN-LX': 'Fortinet FN-TRAN-LX 1G SFP LX 10 km modul',
  'FN-TRAN-SX': 'Fortinet FN-TRAN-SX 1G SFP SX modul',
  'FN-TRAN-SFP-LR': 'Fortinet FN-TRAN-SFP+LR 10G SFP+ LR 10 km modul',
  'FN-TRAN-SFP-SR': 'Fortinet FN-TRAN-SFP+SR 10G SFP+ SR modul',
  'FEX-200F': 'Fortinet FortiExtender 200F LAN extender',
  'SP-CONSOLE-USB-10': 'Fortinet USB–RJ45 konsol kabeli (10-pack)',
  'SP-FG300E-PS': 'Fortinet FortiGate E-series AC power supply',
  'SP-FG60CPCOR-EU': 'Fortinet EU C6 qida kabeli',
  'SP-FG60E-PDC-1': 'Fortinet FortiGate desktop AC adapter',
  'SP-FG60E-PDC-2': 'Fortinet FortiGate desktop AC adapter paketi',
  'SP-RACKTRAY-02': 'Fortinet FortiGate desktop rack tray',
  'FN-CABLE-SFP-1': 'Fortinet 10G SFP+ DAC kabel 1 m',
  'FN-CABLE-SFP-3': 'Fortinet 10G SFP+ DAC kabel 3 m',
};

export function normalizeFortinetSku(model: string): string {
  const folded = model.trim().toUpperCase().replace(/\s+/g, '');
  const aliased = FORTINET_SKU_ALIASES[folded];
  if (aliased !== undefined) {
    return aliased;
  }
  return folded
    .replace(/\+/g, '-')
    .replace(/[^A-Z0-9._-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

export function listFortinetCatalogNameSkus(): string[] {
  return Object.keys(FORTINET_CATALOG_NAMES);
}

export function resolveFortinetCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const catalogName = FORTINET_CATALOG_NAMES[normalizeFortinetSku(sku)];
  if (catalogName !== undefined) {
    return catalogName;
  }
  const trimmed = fallbackTitle.trim();
  if (/^fortinet\b/i.test(trimmed)) {
    return trimmed;
  }
  return `Fortinet ${trimmed}`.trim();
}
