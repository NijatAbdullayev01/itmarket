/**
 * Hand-crafted Vertiv catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';
import { normalizeVertivSku } from './vertiv-product-name';

export type VertivSeoSpec = {
  label: string;
  value: string;
};

export type VertivSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type VertivSeoInput = {
  sku: string;
  title: string;
  specs: readonly VertivSeoSpec[];
  subcategorySlug: string;
};

type VertivSeoDraft = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

const HANDCRAFTED_VERTIV_SEO: Record<string, VertivSeoDraft> = {
  'GXE3-3000IRT2UXL': {
    seoTitle: 'Vertiv Liebert GXE3 3kVA UPS',
    seoDescription:
      'Vertiv Liebert GXE3 3kVA (GXE3-3000IRT2UXL): 3.000 VA/2.700 W On-Line, 2U rack, 8×C13+C19. Orijinal Vertiv UPS, rəsmi 2 il zəmanət və çatdırılma.',
    pageIntro:
      'Vertiv Liebert GXE3 3kVA (GXE3-3000IRT2UXL) 3.000 VA / 2.700 W PF 0.9 double conversion On-Line UPS-dir. Rack/tower 2U, IEC C20 giriş, 8 × IEC C13 + 1 × IEC C19 çıxış və hot-swap VRLA batareya kiçik server və şəbəkə şkafı üçündür. USB, EPO, opsional IntelliSlot və GXE3-EBC72VRT2U xarici batareya ilə orijinal Vertiv GXE3 modelidir. Rəsmi 2 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'GXT5-6000IRT5UXLN': {
    seoTitle: 'Vertiv Liebert GXT5 6kVA UPS',
    seoDescription:
      'Vertiv Liebert GXT5 6kVA (GXT5-6000IRT5UXLN): 6.000 VA/6.000 W On-Line, 5U, RDU101 daxil. Orijinal Vertiv UPS, rəsmi 3 il zəmanət və çatdırılma.',
    pageIntro:
      'Vertiv Liebert GXT5 6kVA (GXT5-6000IRT5UXLN) 6.000 VA / 6.000 W unity PF double conversion On-Line UPS-dir. Rack/tower 5U korpus, hardwire giriş, 6 × IEC C13 + 2 × IEC C19, daxili VRLA batareya və zavodda quraşdırılmış RDU101 şəbəkə kartı server otağı üçündür. Təmiz sinus, hot-swap batareya, 4-post rail kit və rəngli LCD ilə orijinal Vertiv GXT5 N modelidir. Rəsmi 3 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'GXT5-10KIRT5UXLN': {
    seoTitle: 'Vertiv Liebert GXT5 10kVA UPS',
    seoDescription:
      'Vertiv Liebert GXT5 10kVA (GXT5-10KIRT5UXLN): 10 kVA/10 kW On-Line, 5U, RDU101 və rail. Orijinal Vertiv UPS, rəsmi 3 il zəmanət və çatdırılma.',
    pageIntro:
      'Vertiv Liebert GXT5 10kVA (GXT5-10KIRT5UXLN) 10.000 VA / 10.000 W unity PF double conversion On-Line UPS-dir. Rack/tower 5U, hardwire giriş/çıxış, 4 × IEC C13 + 4 × IEC C19, daxili VRLA və zavodda quraşdırılmış RDU101 10 kVA server otağı üçündür. 2+1 parallel, GXT5-EBC192VRT3U, 4-post rail kit və rəngli LCD ilə orijinal Vertiv GXT5 N modelidir. Rəsmi 3 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'GXT5-10KIRT5UXLE': {
    seoTitle: 'Vertiv Liebert GXT5 10kVA UPS E',
    seoDescription:
      'Vertiv GXT5 10kVA E (GXT5-10KIRT5UXLE): 10 kVA/10 kW On-Line, 5U, kart və rail daxil deyil. Orijinal Vertiv UPS, rəsmi 3 il zəmanət və çatdırılma.',
    pageIntro:
      'Vertiv Liebert GXT5 10kVA E (GXT5-10KIRT5UXLE) 10.000 VA / 10.000 W unity PF double conversion On-Line UPS-dir. Rack/tower 5U, hardwire giriş/çıxış və 4 × IEC C13 + 4 × IEC C19; IntelliSlot boşdur, RDU101/RDU120 və RMKIT18-32 ayrı satılır. 2+1 parallel və GXT5-EBC192VRT3U ilə orijinal Vertiv GXT5 E (essential) modelidir. Rəsmi 3 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  RDU101: {
    seoTitle: 'Vertiv IntelliSlot RDU101 kartı',
    seoDescription:
      'Vertiv IntelliSlot RDU101 (RDU101): SNMP, Modbus TCP və HTTPS web UI. GXT5 üçün orijinal Vertiv şəbəkə kartı, rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Vertiv Liebert IntelliSlot RDU101 (RDU101) GXT5 və digər IntelliSlot dəstəkli Vertiv UPS-lər üçün hot-swappable şəbəkə kommunikasiya kartıdır. SNMP v1/v2c/v3, Modbus TCP, HTTPS, RADIUS/LDAP və e-mail/SMS siqnallar uzaqdan izləməyə imkan verir. One-Wire sensor portu temperatur, rütubət və sızma sensorlarını qoşur. Orijinal Vertiv UPS aksesuarıdır; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  RDU120: {
    seoTitle: 'Vertiv IntelliSlot RDU120 kartı',
    seoDescription:
      'Vertiv IntelliSlot RDU120 (RDU120): SNMP, BACnet, REST API və 1 GbE. GXT5 üçün orijinal Vertiv UPS aksesuarı, rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Vertiv Liebert IntelliSlot RDU120 (RDU120) növbəti nəsil hot-swappable şəbəkə kommunikasiya kartıdır. SNMP v1/v2/v3, Modbus TCP/RTU, BACnet IP/MSTP, HTTPS, REST API və 1 GbE Ethernet Vertiv qida və soyutma avadanlığını uzaqdan izləməyə imkan verir. USB-C, Geist one-wire sensor və RADIUS/LDAP ilə orijinal Vertiv UPS aksesuarıdır. Rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'IS-UNITY-SNMP': {
    seoTitle: 'Vertiv IntelliSlot Unity SNMP kartı',
    seoDescription:
      'Vertiv IntelliSlot Unity SNMP (IS-UNITY-SNMP): web/SNMP idarəetmə, GXE3 və GXT üçün. Orijinal Vertiv UPS aksesuarı, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Vertiv Liebert IntelliSlot Unity SNMP (IS-UNITY-SNMP) GXE3, GXT3/GXT4, NXC, EXS və ITA2 hostlar üçün SNMP/Web şəbəkə kartıdır. SNMP v1/v2c/v3, HTTP/HTTPS, e-mail/SMS və Liebert SN sensor portu uzaqdan izləmə və LIFE Services üçündür. Micro-USB konfiqurasiya və Trellis/Power Insight dəstəyi ilə orijinal Vertiv UPS aksesuarıdır. Rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  LI38000B020: {
    seoTitle: 'Vertiv GXT-MT+/RT+ SNMP şəbəkə kartı',
    seoDescription:
      'Vertiv GXT-MT+/RT+ SNMP kartı (LI38000B020): web/SNMP idarəetmə, GXT MT+ və RT+ üçün. Orijinal Vertiv UPS aksesuarı, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Vertiv Liebert GXT-MT+/RT+ SNMP kartı (LI38000B020) GXT MT+ və GXT RT+ UPS-lərin Golden Finger slotu üçün şəbəkə idarəetmə kartıdır. SNMP v1/v2/v3, HTTP, e-mail bildiriş və brauzer UI ilə UPS-i uzaqdan izləmək və idarə etmək olar. EMD sensor portu temperatur və rütubət üçün nəzərdə tutulub. Orijinal Vertiv UPS aksesuarıdır; rəsmi zəmanət və çatdırılma ilə.',
  },
  'RMKIT18-32': {
    seoTitle: 'Vertiv GXT5 rack slide kit 18–32"',
    seoDescription:
      'Vertiv GXT5 rack kit (RMKIT18-32): 18–32" 4-post teleskopik rels, ~90 kq. GXT5 üçün orijinal Vertiv UPS aksesuarı, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Vertiv Liebert GXT5 rack slide kit (RMKIT18-32) 19" şkaf üçün 4-post teleskopik rels dəstidir. 18–32 düym (457–813 mm) dərinlik və təxminən 90 kq yük GXT5 500 VA–10 kVA UPS və uyğun EBC üçün nəzərdə tutulub. Qutuda 2 rels, mötərizə və vint dəsti var. Orijinal Vertiv UPS aksesuarıdır; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'GXT5-5000IRT5UXLN': {
    seoTitle: 'Vertiv Liebert GXT5 5kVA UPS',
    seoDescription:
      'Vertiv Liebert GXT5 5kVA (GXT5-5000IRT5UXLN): 5.000 VA/5.000 W On-Line, 5U rack, RDU101 daxil. Orijinal Vertiv UPS, rəsmi 3 il zəmanət və çatdırılma.',
    pageIntro:
      'Vertiv Liebert GXT5 5kVA (GXT5-5000IRT5UXLN) 5.000 VA / 5.000 W unity PF double conversion On-Line UPS-dir. Rack/tower 5U korpus, hardwire giriş/çıxış, 6 × IEC C13 + 2 × IEC C19, daxili VRLA batareya və RDU101 şəbəkə kartı kiçik server otağı üçündür. Təmiz sinus, hot-swappable batareya, xarici EBC və rəngli LCD ilə orijinal Vertiv GXT5 modelidir. Rəsmi 3 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'GXTRT-1500IRT2UXL': {
    seoTitle: 'Vertiv GXT RT+ 1.5kVA On-Line UPS',
    seoDescription:
      'Vertiv GXT RT+ 1.5kVA (GXTRT-1500IRT2UXL): 1.500 VA/1.350 W On-Line, 2U rack, 6×C13. Orijinal Vertiv UPS, rəsmi 2 il zəmanət və çatdırılma ilə.',
    pageIntro:
      'Vertiv Liebert GXT RT+ 1.5kVA (GXTRT-1500IRT2UXL) 1.500 VA / 1.350 W PF 0.9 double conversion On-Line UPS-dir. Rack/tower 2U, IEC C14 giriş, 6 × IEC C13 çıxış və hot-swappable VRLA batareya kiçik server və şəbəkə avadanlığı üçündür. LCD, USB, Serial, opsional IntelliSlot və xarici EBC ilə orijinal Vertiv GXT RT+ modelidir. Rəsmi 2 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  LI32111CT00: {
    seoTitle: 'Vertiv Liebert itON 600VA UPS',
    seoDescription:
      'Vertiv Liebert itON 600VA (LI32111CT00): 600 VA/360 W line-interactive, AVR, 2 Schuko. Ev-ofis üçün orijinal Vertiv UPS, rəsmi 2 il zəmanət.',
    pageIntro:
      'Vertiv Liebert itON 600VA (LI32111CT00) ev və kiçik ofis üçün kompakt line-interactive UPS-dir. 600 VA / 360 W, AVR, 2 Schuko rozetka və 170–280 V giriş diapazonu kompüter və modem dəstini qorumaq üçündür. Tower korpus, 12 V / 7 Ah VRLA batareya, cold-start və 2 il rəsmi zəmanətlə orijinal Vertiv Liebert itON modelidir. Rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  LI32121CT00: {
    seoTitle: 'Vertiv Liebert itON 800VA UPS',
    seoDescription:
      'Vertiv Liebert itON 800VA (LI32121CT00): 800 VA/480 W line-interactive, AVR, 2 Schuko. Ofis üçün orijinal Vertiv UPS, rəsmi 2 il zəmanət və çatdırılma.',
    pageIntro:
      'Vertiv Liebert itON 800VA (LI32121CT00) 800 VA / 480 W AVR-li line-interactive UPS-dir. 2 Schuko çıxış və 170–280 V giriş diapazonu printer, monitor və sistem blokunu eyni vaxtda qorumağa imkan verir. Tower korpus, 12 V / 9 Ah batareya, overload siqnalı və 2 il zəmanətlə orijinal Vertiv Liebert itON modelidir. Rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
};

function specValue(
  specs: readonly VertivSeoSpec[],
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

function fallbackSeoCopy(input: VertivSeoInput): VertivSeoCopy {
  const power = specValue(input.specs, (label) => label === 'güc');
  const topology = specValue(input.specs, (label) =>
    label.startsWith('topolog'),
  );
  const isAccessory = input.subcategorySlug === 'ups-aksesuarlari';
  const sku = normalizeVertivSku(input.sku);
  const productType = isAccessory
    ? 'Vertiv UPS aksesuarı'
    : 'orijinal Vertiv UPS';

  const seoTitle = clampSeoText(
    `Vertiv ${sku}`.replace(/\s+/g, ' ').trim(),
    SEO_TITLE_SOFT_MAX,
  );

  const parts = [
    `${input.title.trim()} (${sku}) — ${productType}.`,
    power ? `Güc: ${power}.` : null,
    topology ? `${topology} topologiya.` : null,
    'Rəsmi zəmanət və çatdırılma.',
  ].filter((part): part is string => part !== null);

  return {
    seoTitle,
    seoDescription: clampSeoText(parts.join(' '), SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(parts.join(' '), 700),
  };
}

export function resolveVertivProductSeo(input: VertivSeoInput): VertivSeoCopy {
  const sku = normalizeVertivSku(input.sku);
  const crafted = HANDCRAFTED_VERTIV_SEO[sku];
  if (crafted === undefined) {
    return fallbackSeoCopy(input);
  }
  return {
    seoTitle: crafted.seoTitle,
    seoDescription: crafted.seoDescription,
    pageIntro: crafted.pageIntro,
  };
}

export function buildVertivProductDescription(
  pageIntro: string,
  specs: readonly VertivSeoSpec[],
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

export function listHandcraftedVertivSkus(): string[] {
  return Object.keys(HANDCRAFTED_VERTIV_SEO);
}
