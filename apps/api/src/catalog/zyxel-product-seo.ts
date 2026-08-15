/**
 * Hand-crafted Zyxel catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';
import { normalizeZyxelSku } from './zyxel-product-name';

export type ZyxelSeoSpec = {
  label: string;
  value: string;
};

export type ZyxelSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type ZyxelSeoInput = {
  sku: string;
  title: string;
  specs: readonly ZyxelSeoSpec[];
  subcategorySlug: string;
};

type ZyxelSeoDraft = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

const HANDCRAFTED_ZYXEL_SEO: Record<string, ZyxelSeoDraft> = {
  GS1008HP: {
    seoTitle: 'Zyxel GS1008HP 8-port PoE+ kommutator',
    seoDescription:
      'Zyxel GS1008HP: 8×GbE PoE+ 60 W, fanless desktop. Kiçik ofis, IP kamera və VoIP üçün orijinal Zyxel kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Zyxel GS1008HP (GS1008HP) 8 × GbE PoE+ portlu unmanaged kommutatordur. 60 W PoE büdcəsi, IEEE 802.3af/at, 16 Gbps keçid tutumu və fanless soyutma kiçik ofis, IP kamera və VoIP üçün nəzərdə tutulub. Desktop və divar montajı; xarici adapter. Orijinal Zyxel modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'GS1100-10HP': {
    seoTitle: 'Zyxel GS1100-10HP 8-port PoE+ kommutator',
    seoDescription:
      'Zyxel GS1100-10HP: 8×GbE PoE+ 130 W və 2×SFP uplink. Access point və IP kamera üçün orijinal Zyxel kommutator, rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Zyxel GS1100-10HP (GS1100-10HP) 8 × GbE PoE+ və 2 × Gigabit SFP uplink-li unmanaged kommutatordur. 130 W PoE büdcəsi, 20 Gbps keçid tutumu və fanless soyutma access point, IP kamera və fiber uplink üçün uyğundur. Desktop korpus, xarici PSU. Orijinal Zyxel GS1100 modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'GS1100-16': {
    seoTitle: 'Zyxel GS1100-16 16-port kommutator',
    seoDescription:
      'Zyxel GS1100-16: 16×GbE, 32 Gbps, fanless metal korpus. Kiçik ofis şəbəkəsi üçün orijinal Zyxel kommutator, rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Zyxel GS1100-16 (GS1100-16) 16 × GbE portlu unmanaged kommutatordur. 32 Gbps keçid tutumu, 23.8 Mpps forwarding və fanless (0 dBA) soyutma kiçik ofis şəbəkəsi üçündür. Kompakt metal korpus, daxili PSU, max 10 W. Orijinal Zyxel GS1100 modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'GS1100-24E': {
    seoTitle: 'Zyxel GS1100-24E 24-port kommutator',
    seoDescription:
      'Zyxel GS1100-24E: 24×GbE, 48 Gbps, fanless metal korpus. Orta ofis şəbəkəsi üçün orijinal Zyxel kommutator, rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Zyxel GS1100-24E (GS1100-24E) 24 × GbE portlu unmanaged kommutatordur. 48 Gbps keçid tutumu, 35.7 Mpps forwarding və fanless soyutma orta sıxlıqlı ofis üçün nəzərdə tutulub. Kompakt metal korpus (267 mm), daxili PSU, max 13 W. Orijinal Zyxel GS1100 modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'GS1900-48': {
    seoTitle: 'Zyxel GS1900-48 48-port kommutator',
    seoDescription:
      'Zyxel GS1900-48: 48×GbE, 2×SFP və Web Smart L2 idarəetmə. 19" rack ofis şəbəkəsi üçün orijinal Zyxel kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Zyxel GS1900-48 (GS1900-48) 48 × GbE və 2 × SFP uplink-li Smart Managed Layer 2 kommutatordur. 100 Gbps keçid tutumu, VLAN, QoS, IGMP snooping və port aggregation yüksək sıxlıqlı ofis üçün nəzərdə tutulub. 19" 1U rackmount. Orijinal Zyxel GS1900 modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'GS1900-48HPV2': {
    seoTitle: 'Zyxel GS1900-48HPv2 48-port PoE+ kommutator',
    seoDescription:
      'Zyxel GS1900-48HPv2: 24×PoE+ 170 W, 48×GbE və 2×SFP. Access point və IP kamera üçün orijinal Zyxel kommutator, rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Zyxel GS1900-48HPv2 (GS1900-48HPv2) 48 × GbE və 2 × SFP uplink-li Smart Managed Layer 2 PoE+ kommutatordur. 24 PoE+ port, 170 W büdcə və 100 Gbps keçid tutumu access point, IP kamera və VoIP üçündür. Web Smart idarəetmə, 19" 1U rack. Orijinal Zyxel GS1900 modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'GS1920-24HPV2': {
    seoTitle: 'Zyxel GS1920-24HPv2 24-port PoE+ kommutator',
    seoDescription:
      'Zyxel GS1920-24HPv2: 24×PoE+ 375 W, Combo SFP və NebulaFlex. Ofis Wi-Fi və kamera üçün orijinal Zyxel kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Zyxel NebulaFlex GS1920-24HPv2 (GS1920-24HPv2) 24 × GbE PoE+ və 4 × Combo (RJ-45/SFP) portlu Smart L2 kommutatordur. 375 W PoE büdcəsi, 56 Gbps keçid tutumu; Nebula Cloud və ya lokal Web/CLI ilə idarə olunur. 19" 1U rackmount. Orijinal Zyxel GS1920 modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'GS1920-48HPV2': {
    seoTitle: 'Zyxel GS1920-48HPv2 48-port PoE+ kommutator',
    seoDescription:
      'Zyxel GS1920-48HPv2: 48×PoE+ 375 W, Combo/SFP və NebulaFlex. Yüksək sıxlıqlı ofis üçün orijinal Zyxel kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Zyxel NebulaFlex GS1920-48HPv2 (GS1920-48HPv2) 44 × GbE, 4 × Combo (RJ-45/SFP) və 2 × SFP uplink-li Smart L2 PoE+ kommutatordur. 48 PoE port, 375 W büdcə və 100 Gbps keçid tutumu yüksək sıxlıqlı ofis üçündür. Nebula Cloud və ya lokal Web/CLI. Orijinal Zyxel GS1920 modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'XGS1935-28': {
    seoTitle: 'Zyxel XGS1935-28 24-port kommutator',
    seoDescription:
      'Zyxel XGS1935-28: 24×GbE, 4×10G SFP+ və fanless Lite-L3. Ofis aggregation üçün orijinal Zyxel Smart kommutator, rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Zyxel NebulaFlex XGS1935-28 (XGS1935-28) 24 × GbE və 4 × 10G SFP+ uplink-li Lite-L3 Smart kommutatordur. 128 Gbps keçid tutumu, VLAN routing və fanless (0 dBA) soyutma ofis aggregation üçündür. 19" 1U rack, rack kit daxildir. Orijinal Zyxel XGS1935 modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'XGS1935-52': {
    seoTitle: 'Zyxel XGS1935-52 48-port kommutator',
    seoDescription:
      'Zyxel XGS1935-52: 48×GbE, 4×10G SFP+ və Lite-L3 NebulaFlex. Yüksək sıxlıqlı ofis üçün orijinal Zyxel kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Zyxel NebulaFlex XGS1935-52 (XGS1935-52) 48 × GbE və 4 × 10G SFP+ uplink-li Lite-L3 Smart kommutatordur. 176 Gbps keçid tutumu və VLAN routing yüksək sıxlıqlı ofis aggregation üçündür. 19" 1U rack, rack kit daxildir. Orijinal Zyxel XGS1935 modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'GS2220-10': {
    seoTitle: 'Zyxel GS2220-10 8-port kommutator',
    seoDescription:
      'Zyxel GS2220-10: 8×GbE, 2×Combo SFP, fanless L2+ NebulaFlex Pro. Kiçik ofis üçün orijinal Zyxel kommutator, rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Zyxel NebulaFlex Pro GS2220-10 (GS2220-10) 8 × GbE və 2 × Combo (RJ-45/SFP) portlu Layer 2+ managed kommutatordur. 20 Gbps keçid tutumu, fanless soyutma; Nebula Cloud, Web, CLI və SNMP ilə idarə olunur. Kompakt 1U (267 mm). Orijinal Zyxel GS2220 modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'GS2220-28HP': {
    seoTitle: 'Zyxel GS2220-28HP 24-port PoE+ kommutator',
    seoDescription:
      'Zyxel GS2220-28HP: 24×PoE+ 375 W, Combo SFP və L2+ NebulaFlex Pro. AP və IP kamera üçün orijinal Zyxel kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Zyxel NebulaFlex Pro GS2220-28HP (GS2220-28HP) 24 × GbE PoE+ və 4 × Combo (RJ-45/SFP) portlu Layer 2+ managed kommutatordur. 375 W PoE büdcəsi, scheduling və 56 Gbps keçid tutumu access point, IP kamera və VoIP üçündür. Nebula Cloud, Web, CLI, SNMP; 19" 1U rack. Orijinal Zyxel GS2220 modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  NWA50AX: {
    seoTitle: 'Zyxel NWA50AX Wi-Fi 6 Access Point',
    seoDescription:
      'Zyxel NWA50AX: AX1800 Wi-Fi 6, 2×2 MU-MIMO, dəstdə adapter. Kiçik ofis və ev üçün orijinal Zyxel Access Point, rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Zyxel NebulaFlex NWA50AX (NWA50AX) indoor AX1800 Wi-Fi 6 Access Point-dir. Dual-radio MU-MIMO 2×2+2×2 (575 + 1200 Mbps), 1 × GbE LAN; PoE 802.3at və ya dəstdəki 12 V adapter. WPA3 Personal; 802.1X və captive portal yoxdur. Nebula Cloud və ya lokal Web UI. Orijinal Zyxel modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  NWA55AXE: {
    seoTitle: 'Zyxel NWA55AXE outdoor Wi-Fi 6 Access Point',
    seoDescription:
      'Zyxel NWA55AXE: AX1800 outdoor Wi-Fi 6, IP55 və PoE injector. Həyət və anbar üçün orijinal Zyxel Access Point, rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Zyxel NebulaFlex NWA55AXE (NWA55AXE) outdoor AX1800 Wi-Fi 6 Access Point-dir. Dual-radio MU-MIMO 2×2+2×2, xarici antennalar və IP55 mühafizə açıq sahə, həyət və anbar üçündür. Yalnız PoE 802.3at (16 W); EU PoE injector dəstdədir. Smart Mesh, WPA3 Personal. Orijinal Zyxel modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  WAX300H: {
    seoTitle: 'Zyxel WAX300H wall-plate Wi-Fi 6 Access Point',
    seoDescription:
      'Zyxel WAX300H: AX3000 wall-plate Wi-Fi 6, 4×GbE və 5 W PoE out. Otel otağı üçün orijinal Zyxel Access Point, rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Zyxel NebulaFlex Pro WAX300H (WAX300H) AX3000 wall-plate Wi-Fi 6 Access Point-dir. Dual-radio MU-MIMO 2×2+2×2 (575 + 2400 Mbps, 160 MHz), 1 × GbE uplink və 3 × GbE downlink (1-i 5 W PoE out). Yalnız 802.3at PoE (19 W), PSU yoxdur. Otel və otaq quraşdırması; 802.1X, Mesh. Orijinal Zyxel modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
};

function specValue(
  specs: readonly ZyxelSeoSpec[],
  matcher: (label: string) => boolean,
): string | null {
  const found = specs.find((entry) =>
    matcher(entry.label.toLocaleLowerCase('az')),
  );
  if (found === undefined || found.value.trim() === '') {
    return null;
  }
  return found.value.trim();
}

function kindLabel(subcategorySlug: string): string {
  if (subcategorySlug === 'access-point') {
    return 'Access Point';
  }
  return 'kommutator';
}

function fallbackSeoCopy(input: ZyxelSeoInput): ZyxelSeoCopy {
  const sku = normalizeZyxelSku(input.sku);
  const kind = kindLabel(input.subcategorySlug);
  const ports = specValue(input.specs, (label) => label.startsWith('port'));
  const poe = specValue(input.specs, (label) => label === 'poe');
  const speed = specValue(
    input.specs,
    (label) => label.startsWith('sürət') || label.startsWith('suret'),
  );
  const title = input.title.trim() || `Zyxel ${sku}`;

  const parts = [
    `${title} (${sku}) — orijinal Zyxel ${kind}.`,
    ports ? `Portlar: ${ports}.` : null,
    poe ? `PoE: ${poe}.` : null,
    speed ? `Sürət: ${speed}.` : null,
    'Rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  ].filter((part): part is string => part !== null);

  return {
    seoTitle: clampSeoText(title, SEO_TITLE_SOFT_MAX),
    seoDescription: clampSeoText(parts.join(' '), SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(parts.join(' '), 700),
  };
}

export function resolveZyxelProductSeo(input: ZyxelSeoInput): ZyxelSeoCopy {
  const sku = normalizeZyxelSku(input.sku);
  const crafted = HANDCRAFTED_ZYXEL_SEO[sku];
  if (crafted === undefined) {
    return fallbackSeoCopy(input);
  }
  return {
    seoTitle: crafted.seoTitle,
    seoDescription: crafted.seoDescription,
    pageIntro: crafted.pageIntro,
  };
}

export function buildZyxelProductDescription(
  pageIntro: string,
  specs: readonly ZyxelSeoSpec[],
): string {
  const specLines: string[] = [];
  for (const entry of specs) {
    const label = entry.label.trim();
    const value = entry.value.trim();
    if (label === '' || value === '') {
      continue;
    }
    specLines.push(`${label}: ${value}`);
  }
  if (specLines.length === 0) {
    return pageIntro.trim();
  }
  return `${pageIntro.trim()}\n\n${specLines.join('\n')}`;
}

export function listHandcraftedZyxelSkus(): string[] {
  return Object.keys(HANDCRAFTED_ZYXEL_SEO);
}
