/**
 * Hand-crafted Ruckus catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';
import {
  normalizeRuckusSku,
  ruckusDisplayModel,
  type RuckusNameSpec,
} from './ruckus-product-name';

export type RuckusSeoSpec = RuckusNameSpec;

export type RuckusSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type RuckusSeoInput = {
  sku: string;
  title: string;
  specs: readonly RuckusSeoSpec[];
  subcategorySlug: string;
};

type RuckusSeoDraft = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

const HANDCRAFTED_RUCKUS_SEO: Record<string, RuckusSeoDraft> = {
  '901-R350-WW02': {
    seoTitle: 'Ruckus R350 Wi-Fi 6 Access Point',
    seoDescription:
      'Ruckus R350: indoor Wi-Fi 6, 2×2:2, 1×GbE PoE və 256 client. Kiçik ofis üçün orijinal Ruckus Access Point, rəsmi zəmanət və çatdırılma mövcuddur.',
    pageIntro:
      'Ruckus R350 (901-R350-WW02) indoor Wi-Fi 6 (802.11ax) Access Point-dir. Dual-band 2×2:2 radio, BeamFlex+ antenna, 1 × 1 GbE PoE və 256-dək client kiçik ofis WLAN-ı üçündür. ChannelFly, SmartMesh və OFDMA/MU-MIMO dəstəklənir; RUCKUS Cloud, SmartZone, Unleashed və ZoneDirector ilə idarə olunur. Orijinal Ruckus modelidir, rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  '901-R550-WW00': {
    seoTitle: 'Ruckus R550 Wi-Fi 6 Access Point',
    seoDescription:
      'Ruckus R550: indoor Wi-Fi 6, 2×GbE PoE, BLE/Zigbee və 512 client. Sıx ofis üçün orijinal Ruckus Access Point, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Ruckus R550 (901-R550-WW00) indoor Wi-Fi 6 Access Point-dir. Dual-band 2×2:2, 2 × 1 GbE PoE, onboard BLE/Zigbee və 512-dək client sıx ofis üçün nəzərdə tutulub. Plenum rated korpus, ChannelFly və SmartMesh; RUCKUS Cloud, SmartZone və ZoneDirector ilə idarə olunur. Orijinal Ruckus modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  '901-R770-WW00-DEMO': {
    seoTitle: 'Ruckus R770 Wi-Fi 7 Access Point',
    seoDescription:
      'Ruckus R770: indoor Wi-Fi 7 tri-radio, 10GbE və 1024 client. Yüksək sıxlıq üçün orijinal Ruckus Access Point, rəsmi zəmanət və çatdırılma təqdim olunur.',
    pageIntro:
      'Ruckus R770 (901-R770-WW00-DEMO) indoor Wi-Fi 7 (802.11be) tri-radio Access Point-dir. 2.4/5/6 GHz, 8 spatial stream, 1 × 10 GbE + 1 × 1 GbE və 1024-dək client yüksək sıxlıqlı WLAN üçündür. MLO, 4K QAM və BeamFlex+; RUCKUS One, SmartZone və Unleashed ilə idarə olunur. Orijinal Ruckus modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
};

function specValue(
  specs: readonly RuckusSeoSpec[],
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

function specSnippet(specs: readonly RuckusSeoSpec[]): string | null {
  const preferred = [
    specValue(specs, (label) => label === 'tip'),
    specValue(specs, (label) => label === 'wi-fi' || label.startsWith('wi-fi')),
    specValue(specs, (label) => label === 'radio'),
    specValue(specs, (label) => label.startsWith('ethernet')),
    specValue(specs, (label) => label.startsWith('client')),
  ].filter((value): value is string => value !== null);
  if (preferred.length === 0) {
    return null;
  }
  return preferred.slice(0, 2).join(', ');
}

function fallbackSeoCopy(input: RuckusSeoInput): RuckusSeoCopy {
  const sku = normalizeRuckusSku(input.sku);
  const model = ruckusDisplayModel(sku, input.title, input.specs);
  const snippet = specSnippet(input.specs);
  const kind = 'Access Point';

  const seoTitle = clampSeoText(
    input.title.trim() || `Ruckus ${model} ${kind}`,
    SEO_TITLE_SOFT_MAX,
  );

  const descriptionParts = [
    `Ruckus ${model}: ${snippet ?? kind}.`,
    `Orijinal Ruckus ${kind}, rəsmi zəmanət və çatdırılma.`,
  ];
  let seoDescription = descriptionParts.join(' ');
  if (seoDescription.length < 140) {
    seoDescription = `${seoDescription} Kataloqda orijinal model, rəsmi zəmanətlə satılır.`;
  }
  if (seoDescription.length < 140) {
    seoDescription = `${seoDescription} Ruckus şəbəkə avadanlığı rəsmi zəmanətlə təqdim olunur.`;
  }

  const introBits = [
    `${input.title.trim()} (${sku}) orijinal Ruckus ${kind}dir.`,
    snippet ? `${snippet}.` : null,
    'Ofis və şəbəkə infrastrukturu üçün nəzərdə tutulub.',
    'Orijinal Ruckus modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  ].filter((part): part is string => part !== null);

  return {
    seoTitle,
    seoDescription: clampSeoText(seoDescription, SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(introBits.join(' '), 700),
  };
}

export function resolveRuckusProductSeo(input: RuckusSeoInput): RuckusSeoCopy {
  const sku = normalizeRuckusSku(input.sku);
  const crafted = HANDCRAFTED_RUCKUS_SEO[sku];
  if (crafted === undefined) {
    return fallbackSeoCopy(input);
  }
  return {
    seoTitle: crafted.seoTitle,
    seoDescription: crafted.seoDescription,
    pageIntro: crafted.pageIntro,
  };
}

export function buildRuckusProductDescription(
  pageIntro: string,
  specs: readonly RuckusSeoSpec[],
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

export function listHandcraftedRuckusSkus(): string[] {
  return Object.keys(HANDCRAFTED_RUCKUS_SEO);
}
