/**
 * Hand-crafted Vertiv catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';

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
  LI38000B020: {
    seoTitle: 'Vertiv GXT-MT+ SNMP şəbəkə kartı',
    seoDescription:
      'Vertiv GXT-MT+ SNMP kartı (LI38000B020): web/SNMP idarəetmə, GXT MT+ və GXT RT+ üçün. Orijinal Vertiv UPS aksesuarı, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Vertiv Liebert GXT-MT+ SNMP kartı (LI38000B020) GXT MT+ və GXT RT+ UPS-lərin Golden Finger slotu üçün şəbəkə idarəetmə kartıdır. SNMP v1/v2/v3, HTTP, e-mail bildiriş və brauzer UI ilə UPS-i uzaqdan izləmək və idarə etmək olar. EMD sensor portu temperatur və rütubət üçün nəzərdə tutulub. Orijinal Vertiv UPS aksesuarıdır; rəsmi zəmanət və çatdırılma ilə.',
  },
  RDU101: {
    seoTitle: 'Vertiv IntelliSlot RDU101 kartı',
    seoDescription:
      'Vertiv IntelliSlot RDU101 (RDU101): SNMP, Modbus TCP və HTTPS web UI. GXT5 üçün orijinal Vertiv şəbəkə kartı, rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Vertiv Liebert IntelliSlot RDU101 (RDU101) GXT5 və digər IntelliSlot dəstəkli Vertiv UPS-lər üçün hot-swappable şəbəkə kommunikasiya kartıdır. SNMP v1/v2c/v3, Modbus TCP, HTTPS, RADIUS/LDAP və e-mail/SMS siqnallar uzaqdan izləməyə imkan verir. One-Wire sensor portu temperatur, rütubət və sızma sensorlarını qoşur. Orijinal Vertiv UPS aksesuarıdır; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
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
  const sku = input.sku.trim().toUpperCase();
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
  const sku = input.sku.trim().toUpperCase();
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
