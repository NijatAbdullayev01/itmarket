/**
 * Hand-crafted Delta catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';

export type DeltaSeoSpec = {
  label: string;
  value: string;
};

export type DeltaSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type DeltaSeoInput = {
  sku: string;
  title: string;
  specs: readonly DeltaSeoSpec[];
  subcategorySlug: string;
};

type DeltaSeoDraft = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

const HANDCRAFTED_DELTA_SEO: Record<string, DeltaSeoDraft> = {
  UPA302R2RX0B035: {
    seoTitle: 'Delta Amplon RT Gen3 3kVA UPS',
    seoDescription:
      'Delta Amplon RT Gen3 3kVA (UPA302R2RX0B035): 3.000 VA/2.700 W On-Line, daxili batareya, 2U. Rack/tower üçün orijinal Delta, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Delta Amplon RT Gen3 3kVA (UPA302R2RX0B035) 3.000 VA / 2.700 W double conversion On-Line UPS-dir. Rack/tower 2U korpus, daxili 6 × VRLA batareya, 4 × IEC C13 + 1 × IEC C19 çıxış və təmiz sinus dalğası kiçik server, şəbəkə və ofis avadanlığı üçündür. Mini Slot, USB, RS-232 və ECO rejim ilə orijinal Delta Amplon RT Gen3 modelidir. Rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  UPS203R6RT2N035: {
    seoTitle: 'Delta Amplon RT 20kVA On-Line UPS',
    seoDescription:
      'Delta Amplon RT 20kVA (UPS203R6RT2N035): 20 kVA/20 kW On-Line, 3:1/3:3, 2U rack. Xarici EBC, paralel, orijinal Delta, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Delta Amplon RT 20kVA (UPS203R6RT2N035) 20.000 VA / 20.000 W unity PF double conversion On-Line UPS-dir. 2U rack/tower, 3:3 və ya 3:1 çıxış (400 V və ya 230 V) və xarici EBC ilə runtime genişlənməsi orta tutumlu server otağı üçündür. Mini Slot, USB, RS-232, RS-485, REPO və 4 ədədə qədər paralel işləmə ilə orijinal Delta Amplon RT həllidir. Rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  UPS303HH330N035: {
    seoTitle: 'Delta Ultron HPH Gen.2 30kVA UPS',
    seoDescription:
      'Delta Ultron HPH Gen.2 30kVA (UPS303HH330N035): 30 kVA/30 kW On-Line tower, unity PF, battery kit. Orijinal Delta UPS, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Delta Ultron HPH Gen.2 30kVA (UPS303HH330N035) 30.000 VA / 30.000 W unity power factor On-Line tower UPS-dir. Double conversion, təmiz sinus, 3P4W 400 V və daxil olan battery kit kritik IT və sənaye yükü üçündür. 5" toxunma ekran, Mini Slot ×2, USB, RS-232 və 4 ədədə qədər paralel ilə orijinal Delta Ultron HPH Gen.2 modelidir. Rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  UPS403HH330N035: {
    seoTitle: 'Delta Ultron HPH Gen.2 40kVA UPS',
    seoDescription:
      'Delta Ultron HPH Gen.2 40kVA (UPS403HH330N035): 40 kVA/40 kW On-Line tower, unity PF, battery kit. Kritik yük üçün orijinal Delta, rəsmi zəmanət.',
    pageIntro:
      'Delta Ultron HPH Gen.2 40kVA (UPS403HH330N035) 40.000 VA / 40.000 W unity PF double conversion On-Line tower UPS-dir. Təmiz sinus, 3P4W 400 V, battery kit və >96% AC-AC səmərəlilik data mərkəzi və sənaye avadanlığı üçündür. 5" rəngli toxunma ekran, iki Mini Slot, USB, RS-232, dry contact və 4 ədədə qədər paralel ilə orijinal Delta Ultron HPH Gen.2-dir. Rəsmi zəmanət və çatdırılma ilə.',
  },
  UPS502R2RT2N035: {
    seoTitle: 'Delta Amplon RT 5kVA On-Line UPS',
    seoDescription:
      'Delta Amplon RT 5kVA (UPS502R2RT2N035): 5.000 VA/5.000 W On-Line, 1:1 230V, 2U rack. Xarici EBC, orijinal Delta UPS, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Delta Amplon RT 5kVA (UPS502R2RT2N035) 5.000 VA / 5.000 W unity PF double conversion On-Line UPS-dir. 2U rack/tower, 1:1 230 V və xarici EBC (məs. BBU161B107035) ilə runtime genişlənməsi ofis və kiçik server şkafı üçündür. Mini Slot, USB, RS-232, RS-485, REPO və 4 ədədə qədər paralel ilə orijinal Delta Amplon RT modelidir. Rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  BBU161B107035: {
    seoTitle: 'Delta Amplon RT 2U EBC 16×7Ah',
    seoDescription:
      'Delta Amplon RT 2U EBC (BBU161B107035): 16×7Ah xarici batareya kabineti, rack/tower 2U. RT 5–6 kVA üçün orijinal Delta aksesuarı, rəsmi zəmanət.',
    pageIntro:
      'Delta Amplon RT 2U EBC (BBU161B107035) Amplon RT 5–20 kVA seriyası üçün xarici batareya kabinetidir. Rack/tower 2U korpusda 16 × 7 Ah VRLA batareya runtime-i uzadır; əsasən RT 5/6 kVA modelləri (məs. UPS502R2RT2N035) ilə uyğundur. Hot-swappable dəstəkli UPS-lərdə ehtiyat müddətini artırmaq üçün orijinal Delta aksesuarıdır. Rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  BBU201B109035: {
    seoTitle: 'Delta Amplon RT 3U EBC 20×9Ah',
    seoDescription:
      'Delta Amplon RT 3U EBC (BBU201B109035): 20×9Ah xarici batareya kabineti, rack/tower 3U. RT 8–20 kVA üçün orijinal Delta aksesuarı, rəsmi zəmanət.',
    pageIntro:
      'Delta Amplon RT 3U EBC (BBU201B109035) Amplon RT 5–20 kVA seriyası üçün xarici batareya kabinetidir. Rack/tower 3U korpusda 20 × 9 Ah VRLA batareya daha uzun runtime verir; əsasən RT 8/10 kVA və 3-faza RT modelləri ilə uyğundur. UPS-in ehtiyat müddətini artırmaq üçün orijinal Delta aksesuarıdır. Rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  SCMS100035: {
    seoTitle: 'Delta Mini SNMP IPv6 şəbəkə kartı',
    seoDescription:
      'Delta Mini SNMP IPv6 kartı (SCMS100035): hot-swap Mini Slot, SNMP, HTTP(S) və Modbus TCP. Delta UPS üçün orijinal şəbəkə aksesuarı, rəsmi zəmanət.',
    pageIntro:
      'Delta Mini SNMP IPv6 kartı (SCMS100035) Amplon və Ultron UPS-lərin Mini Slot-u üçün hot-swappable şəbəkə idarəetmə kartıdır. SNMP, HTTP(S), Modbus TCP və IPv6 ilə UPS-i brauzer və ya idarəetmə stansiyasından izləmək və idarə etmək olar. InsightPower G3 / Mini SNMP IPv6 (NEW) kimi tanınır. Orijinal Delta UPS aksesuarıdır; rəsmi zəmanət və çatdırılma ilə.',
  },
};

function specValue(
  specs: readonly DeltaSeoSpec[],
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

function fallbackSeoCopy(input: DeltaSeoInput): DeltaSeoCopy {
  const power = specValue(input.specs, (label) => label === 'güc');
  const topology = specValue(input.specs, (label) =>
    label.startsWith('topolog'),
  );
  const isAccessory = input.subcategorySlug === 'ups-aksesuarlari';
  const sku = input.sku.trim().toUpperCase();
  const productType = isAccessory
    ? 'Delta UPS aksesuarı'
    : 'orijinal Delta UPS';

  const seoTitle = clampSeoText(
    `Delta ${sku}`.replace(/\s+/g, ' ').trim(),
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

export function resolveDeltaProductSeo(input: DeltaSeoInput): DeltaSeoCopy {
  const sku = input.sku.trim().toUpperCase();
  const crafted = HANDCRAFTED_DELTA_SEO[sku];
  if (crafted === undefined) {
    return fallbackSeoCopy(input);
  }
  return {
    seoTitle: crafted.seoTitle,
    seoDescription: crafted.seoDescription,
    pageIntro: crafted.pageIntro,
  };
}

export function buildDeltaProductDescription(
  pageIntro: string,
  specs: readonly DeltaSeoSpec[],
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

export function listHandcraftedDeltaSkus(): string[] {
  return Object.keys(HANDCRAFTED_DELTA_SEO);
}
