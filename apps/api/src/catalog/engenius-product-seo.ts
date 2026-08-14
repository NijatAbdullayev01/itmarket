/**
 * Hand-crafted EnGenius catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';

export type EnGeniusSeoSpec = {
  label: string;
  value: string;
};

export type EnGeniusSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type EnGeniusSeoInput = {
  sku: string;
  title: string;
  specs: readonly EnGeniusSeoSpec[];
  subcategorySlug: string;
};

type EnGeniusSeoDraft = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

const HANDCRAFTED_ENGENIUS_SEO: Record<string, EnGeniusSeoDraft> = {
  'EWS1200-28TFP': {
    seoTitle: 'EnGenius EWS1200-28TFP PoE+ kommutator',
    seoDescription:
      'EnGenius EWS1200-28TFP: 24×GbE PoE+ 410 W, 4×SFP və 50 AP idarəetmə. Ofis Wi-Fi və IP kamera üçün orijinal EnGenius kommutator, rəsmi zəmanət.',
    pageIntro:
      'EnGenius EWS1200-28TFP (EWS1200-28TFP) 24 × GbE PoE+ portlu, 410 W PoE büdcəli Layer 2 kommutatordur. 4 × 1G SFP uplink və 50 ədədə qədər Neutron EWS access point-in lokal idarəetməsi ofis Wi-Fi, IP kamera və VoIP üçün nəzərdə tutulub. Web GUI, ezMaster və SkyKey ilə idarə olunur; 19" 1U rackmount korpusdadır. Orijinal EnGenius Neutron modelidir, rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  ECS1528P: {
    seoTitle: 'EnGenius ECS1528P Cloud PoE+ kommutator',
    seoDescription:
      'EnGenius ECS1528P: 24×GbE PoE+ 240 W, 4×10G SFP+ və Cloud idarəetmə. PD Lifeguard ilə orijinal EnGenius kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius ECS1528P (ECS1528P) Cloud Managed Layer 2+ PoE+ kommutatordur: 24 × GbE PoE+ (240 W), 4 × 10G SFP+ uplink və 128 Gbps switching. PoE Extended Mode kabel məsafəsini 250 m-ə qədər uzadır; PD Lifeguard uğursuz kameranı avto-reboot edir, Continuous PoE isə yeniləmə zamanı qidanı kəsmir. EnGenius Cloud, SkyKey, ezMaster və standalone Web GUI ilə idarə olunur. Orijinal EnGenius Cloud modelidir; rəsmi zəmanət və çatdırılma ilə.',
  },
  ECS1552: {
    seoTitle: 'EnGenius ECS1552 48-port kommutator',
    seoDescription:
      'EnGenius ECS1552: 48×GbE, 4×10G SFP+ və Cloud L2+ idarəetmə. Yüksək sıxlıqlı ofis üçün orijinal EnGenius kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius ECS1552 (ECS1552) PoE-siz Cloud Managed Layer 2+ kommutatordur: 48 × GbE access port, 4 × 10G SFP+ uplink və 176 Gbps switching. VLAN, QoS, LAG, ACL və static routing yüksək sıxlıqlı ofis və access aggregation üçün nəzərdə tutulub. EnGenius Cloud, SkyKey, ezMaster və standalone Web GUI ilə idarə olunur. 19" 1U rackmount, orijinal EnGenius Cloud modeli; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  EWS7928P: {
    seoTitle: 'EnGenius EWS7928P Neutron PoE+ kommutator',
    seoDescription:
      'EnGenius EWS7928P: 24×GbE PoE+ 185 W, 4×SFP və 50 AP wireless idarəetmə. AP, kamera və VoIP üçün orijinal EnGenius kommutator, rəsmi zəmanət.',
    pageIntro:
      'EnGenius EWS7928P (EWS7928P) 24 × GbE PoE+ portlu Layer 2 kommutator və wireless idarəetmə cihazıdır. 185 W PoE büdcəsi, 4 × 1G SFP uplink və 50 ədədə qədər Neutron EWS AP-nin lokal idarəetməsi access point, IP kamera və VoIP üçün uyğundur. Web GUI, ezMaster və SkyKey ilə idarə olunur; 19" 1U rackmount. Orijinal EnGenius Neutron modelidir, rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
};

function specValue(
  specs: readonly EnGeniusSeoSpec[],
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

function fallbackSeoCopy(input: EnGeniusSeoInput): EnGeniusSeoCopy {
  const sku = input.sku.trim().toUpperCase();
  const ports = specValue(input.specs, (label) => label.startsWith('port'));
  const poe = specValue(input.specs, (label) => label === 'poe');

  const seoTitle = clampSeoText(
    `EnGenius ${sku} kommutator`.replace(/\s+/g, ' ').trim(),
    SEO_TITLE_SOFT_MAX,
  );

  const parts = [
    `${input.title.trim()} (${sku}) — orijinal EnGenius kommutator.`,
    ports ? `Portlar: ${ports}.` : null,
    poe ? `PoE: ${poe}.` : null,
    'Rəsmi zəmanət və çatdırılma.',
  ].filter((part): part is string => part !== null);

  return {
    seoTitle,
    seoDescription: clampSeoText(parts.join(' '), SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(parts.join(' '), 700),
  };
}

export function resolveEnGeniusProductSeo(
  input: EnGeniusSeoInput,
): EnGeniusSeoCopy {
  const sku = input.sku.trim().toUpperCase();
  const crafted = HANDCRAFTED_ENGENIUS_SEO[sku];
  if (crafted === undefined) {
    return fallbackSeoCopy(input);
  }
  return {
    seoTitle: crafted.seoTitle,
    seoDescription: crafted.seoDescription,
    pageIntro: crafted.pageIntro,
  };
}

export function buildEnGeniusProductDescription(
  pageIntro: string,
  specs: readonly EnGeniusSeoSpec[],
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

export function listHandcraftedEnGeniusSkus(): string[] {
  return Object.keys(HANDCRAFTED_ENGENIUS_SEO);
}
