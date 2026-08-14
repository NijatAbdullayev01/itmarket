/**
 * Hand-crafted QNAP catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';
import { normalizeQnapSku } from './qnap-product-name';

export type QnapSeoSpec = {
  label: string;
  value: string;
};

export type QnapSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type QnapSeoInput = {
  sku: string;
  title: string;
  specs: readonly QnapSeoSpec[];
  subcategorySlug: string;
};

type QnapSeoDraft = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

const HANDCRAFTED_QNAP_SEO: Record<string, QnapSeoDraft> = {
  'TS-435XEU-4G': {
    seoTitle: 'QNAP TS-435XeU-4G 4-bay NAS',
    seoDescription:
      'QNAP TS-435XeU-4G: 4-bay 1U rack NAS, 2×10GbE SFP+ və 2×2.5GbE. Kiçik ofis şkafı üçün orijinal QNAP NAS, NVMe cache ilə. Rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'QNAP TS-435XeU-4G (TS-435XeU-4G) 4-bay short-depth 1U rackmount NAS-dır. Marvell OCTEON TX2 CN9130 4-core 2.2 GHz, 4 GB DDR4 (max. 32 GB), 2 × 10GbE SFP+ və 2 × 2.5GbE kiçik ofis və server şkafı üçündür. 2 × M.2 NVMe cache, hot-swap yuvalar və 3 il rəsmi zəmanətlə orijinal QNAP modelidir.',
  },
  'TS-873AEU-4G': {
    seoTitle: 'QNAP TS-873AeU-4G 8-bay NAS',
    seoDescription:
      'QNAP TS-873AeU-4G: 8-bay 2U short-depth NAS, Ryzen V1500B və 2×2.5GbE. PCIe genişlənmə ilə orijinal QNAP NAS, QTS/QuTS hero. Rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'QNAP TS-873AeU-4G (TS-873AeU-4G) 8-bay short-depth 2U rackmount NAS-dır. AMD Ryzen Embedded V1500B 4-core/8-thread 2.2 GHz, 4 GB DDR4 (max. 64 GB, ECC dəstəyi) və 2 × 2.5GbE ofis yaddaşı üçündür. 2 × M.2 NVMe cache, PCIe Gen3 x8 (10/25GbE və ya GPU) və QTS/QuTS hero ilə orijinal QNAP modelidir; 3 il rəsmi zəmanət və çatdırılma ilə.',
  },
  'TS-832PXU-4G-EU': {
    seoTitle: 'QNAP TS-832PXU-4G 8-bay NAS',
    seoDescription:
      'QNAP TS-832PXU-4G: 8-bay rack NAS, 2×10GbE SFP+ və 2×2.5GbE. Orta tutumlu ofis yaddaşı üçün orijinal QNAP EU variantı. Rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'QNAP TS-832PXU-4G (TS-832PXU-4G-EU) 8-bay rackmount NAS-dır. Annapurna Labs Alpine AL324 4-core 1.7 GHz, 4 GB DDR4 (max. 16 GB), 2 × 10GbE SFP+ və 2 × 2.5GbE orta tutumlu ofis yaddaşı üçündür. Hot-swap SATA yuvalar, PCIe Gen2 x2 və 3 il rəsmi zəmanətlə orijinal QNAP EU variantıdır.',
  },
  'TS-233': {
    seoTitle: 'QNAP TS-233 2-bay tower NAS',
    seoDescription:
      'QNAP TS-233: 2-bay tower NAS, ARM Cortex-A55 2.0 GHz və 2 GB RAM. Ev və kiçik ofis yaddaşı üçün orijinal QNAP, Mali-G52. Rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'QNAP TS-233 (TS-233) 2-bay tower NAS-dır. ARM Cortex-A55 4-core 2.0 GHz, Mali-G52 hardware transcoding və 2 GB onboard RAM ev və kiçik ofis yaddaşı üçündür. 1 × 1GbE, USB 3.2 Gen 1 və 2 il rəsmi zəmanətlə orijinal QNAP modelidir; çatdırılma ilə təqdim olunur.',
  },
  'QXG-10G2SF-X710': {
    seoTitle: 'QNAP QXG-10G2SF-X710 10GbE adapter',
    seoDescription:
      'QNAP QXG-10G2SF-X710: dual-port SFP+ 10GbE PCIe Gen3 x8 kart. NAS və iş stansiyası üçün orijinal QNAP adapter, SR-IOV. Rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'QNAP QXG-10G2SF-X710 (QXG-10G2SF-X710) dual-port 10GbE şəbəkə genişləndirmə kartıdır. 2 × SFP+ (10G/1G), PCIe Gen3 x8, low-profile form faktor və SR-IOV QNAP NAS (QTS/QuTS hero 5.1+), Windows və Ubuntu üçündür. Full-height bracket dəstə ilə gəlir; 3 il rəsmi zəmanət və çatdırılma ilə orijinal QNAP adapteridir.',
  },
  'KOIBOX-100W': {
    seoTitle: 'QNAP KoiBox-100W konfrans kamerası',
    seoDescription:
      'QNAP KoiBox-100W: 4K wireless presentation və video konfrans. Hybrid meeting otağı üçün orijinal QNAP həlli, Wi-Fi 6. Rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'QNAP KoiBox-100W (KoiBox-100W) görüş otağı üçün video konfrans və 4K wireless presentation cihazıdır. Intel Celeron 6305, 4 GB DDR4, Wi-Fi 6, HDMI çıxış və 4 × USB 3.2 Gen 2 hybrid iclaslar üçündür. M.2 SSD və 2.5" SATA yuva, IR pult dəstəyi ilə orijinal QNAP Smart Collaboration modelidir; rəsmi zəmanət və çatdırılma ilə.',
  },
  'QSW-M1204-4C': {
    seoTitle: 'QNAP QSW-M1204-4C 10GbE kommutator',
    seoDescription:
      'QNAP QSW-M1204-4C: 12-port 10GbE web managed switch, 8×SFP+ və 4×combo. Rackmount ofis üçün orijinal QNAP, 240 Gbps. Rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'QNAP QSW-M1204-4C (QSW-M1204-4C) 12-port 10GbE web managed kommutatordur. 8 × 10GbE SFP+, 4 × 10GbE SFP+/RJ45 combo (NBASE-T 10G/5G/2.5G/1G/100M) və 240 Gbps switching ofis aggregation üçündür. VLAN, QoS, LACP, ACL və RSTP web UI ilə idarə olunur; rackmount korpus, 2 il rəsmi zəmanət və çatdırılma ilə orijinal QNAP modelidir.',
  },
  'QSW-M408-4C': {
    seoTitle: 'QNAP QSW-M408-4C kommutator',
    seoDescription:
      'QNAP QSW-M408-4C: 8×1GbE və 4×10G combo web managed switch. Masaüstü ofis üçün orijinal QNAP kommutator, 96 Gbps. Rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'QNAP QSW-M408-4C (QSW-M408-4C) 12-port web managed kommutatordur. 8 × 1GbE RJ45, 4 × 10GbE SFP+/RJ45 combo (NBASE-T) və 96 Gbps switching kiçik ofis üçün nəzərdə tutulub. Desktop form faktor, web UI idarəetmə və 2 il rəsmi zəmanətlə orijinal QNAP modelidir; çatdırılma ilə təqdim olunur.',
  },
  'RAIL-B02': {
    seoTitle: 'QNAP RAIL-B02 rack rels',
    seoDescription:
      'QNAP RAIL-B02: 1U/2U rack slide rels dəsti, TS/TVS U seriyası üçün. QNAP NAS şkafına montaj üçün orijinal aksesuar, 443–815 mm. Rəsmi zəmanət.',
    pageIntro:
      'QNAP RAIL-B02 (RAIL-B02) 1U/2U QNAP rackmount NAS üçün slide rail dəstidir. TVS-x71U, TS-x53U, TS-x70U-RP, TS-x69U-RP və oxşar modellərlə uyğundur. Rack post eni ≥ 451 mm, dərinlik 443–815 mm; square və ya round-hole rack üçün nəzərdə tutulub. Orijinal QNAP NAS aksesuarıdır, rəsmi zəmanət və çatdırılma ilə.',
  },
  '7212324T-7050000-000-RS': {
    seoTitle: 'QNAP IronWolf 24TB NAS HDD',
    seoDescription:
      'QNAP IronWolf 24TB: 3.5" SATA III NAS HDD, Seagate 5 il zəmanət. Böyük tutumlu QNAP NAS yaddaşı üçün orijinal kanal SKU, 24/7. Rəsmi çatdırılma.',
    pageIntro:
      'QNAP 7212324T-7050000-000-RS Seagate IronWolf 24 TB 3.5" SATA III NAS HDD-dir. NAS üçün optimallaşdırılmış IronWolf seriyası QNAP və digər NAS korpuslarında 24/7 işləmək üçündür. QNAP kanal SKU-su ilə satılır; 5 il istehsalçı zəmanəti və çatdırılma ilə orijinal diskdir.',
  },
  '72123400-6000000-000-RS': {
    seoTitle: 'QNAP IronWolf 4TB NAS HDD',
    seoDescription:
      'QNAP IronWolf 4TB: 3.5" SATA III NAS HDD, Seagate IronWolf seriyası. Kiçik QNAP NAS üçün orijinal kanal SKU, 2-4 bay. Rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'QNAP 72123400-6000000-000-RS Seagate IronWolf 4 TB 3.5" SATA III NAS HDD-dir. NAS üçün optimallaşdırılmış IronWolf seriyası 2-bay və 4-bay QNAP korpuslarında etibarlı yaddaş üçündür. QNAP kanal SKU-su ilə satılır; orijinal disk, rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  '72123800-6051100-000-RS': {
    seoTitle: 'QNAP IronWolf 8TB NAS HDD',
    seoDescription:
      'QNAP IronWolf 8TB (ST8000VN004): 3.5" SATA III NAS HDD. Orta tutumlu QNAP NAS üçün orijinal kanal SKU, ST8000VN004. Rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'QNAP 72123800-6051100-000-RS Seagate IronWolf 8 TB (ST8000VN004) 3.5" SATA III NAS HDD-dir. NAS üçün optimallaşdırılmış IronWolf seriyası orta tutumlu QNAP korpuslarında 24/7 işləmək üçündür. QNAP kanal SKU-su ilə satılır; orijinal disk, rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
};

function specValue(
  specs: readonly QnapSeoSpec[],
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

function fallbackSeoCopy(input: QnapSeoInput): QnapSeoCopy {
  const sku = normalizeQnapSku(input.sku);
  const tip = specValue(input.specs, (label) => label === 'tip');

  const seoTitle = clampSeoText(
    input.title.trim() || `QNAP ${sku}`,
    SEO_TITLE_SOFT_MAX,
  );

  const parts = [
    `${input.title.trim()} (${sku}) — orijinal QNAP məhsulu.`,
    tip ? `${tip}.` : null,
    'Rəsmi zəmanət və çatdırılma.',
  ].filter((part): part is string => part !== null);

  return {
    seoTitle,
    seoDescription: clampSeoText(parts.join(' '), SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(parts.join(' '), 700),
  };
}

export function resolveQnapProductSeo(input: QnapSeoInput): QnapSeoCopy {
  const sku = normalizeQnapSku(input.sku);
  const crafted = HANDCRAFTED_QNAP_SEO[sku];
  if (crafted === undefined) {
    return fallbackSeoCopy(input);
  }
  return {
    seoTitle: crafted.seoTitle,
    seoDescription: crafted.seoDescription,
    pageIntro: crafted.pageIntro,
  };
}

export function buildQnapProductDescription(
  pageIntro: string,
  specs: readonly QnapSeoSpec[],
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

export function listHandcraftedQnapSkus(): string[] {
  return Object.keys(HANDCRAFTED_QNAP_SEO);
}
