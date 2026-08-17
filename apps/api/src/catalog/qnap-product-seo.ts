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
  'RAIL-A02-90': {
    seoTitle: 'QNAP RAIL-A02-90 Kingslide rack rels',
    seoDescription:
      'QNAP RAIL-A02-90: Kingslide slide rels, 90 kq yük və square-hole rack. Dərin QNAP NAS şkafı üçün orijinal aksesuar. Rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'QNAP RAIL-A02-90 (RAIL-A02-90) Kingslide rack slide rels dəstidir. TS-EC2480U-RP və oxşar dərin rackmount QNAP NAS modelləri üçün nəzərdə tutulub: maks. 90 kq yük, rack dirəyi 578.6–871.5 mm, yalnız 9.5 × 9.5 mm square-hole. Orijinal QNAP NAS aksesuarıdır; 1 il rəsmi zəmanət və çatdırılma ilə.',
  },
  'QSW-1105-5T': {
    seoTitle: 'QNAP QSW-1105-5T 2.5GbE kommutator',
    seoDescription:
      'QNAP QSW-1105-5T: 5×2.5GbE unmanaged, 25 Gbps və səssiz fanless korpus. NAS uplink üçün orijinal QNAP kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'QNAP QSW-1105-5T (QSW-1105-5T) 5 × 2.5GbE RJ45 portlu unmanaged kommutatordur. 25 Gbps keçid tutumu, 16K MAC, 9K jumbo frame və fanless desktop korpus kiçik ofis NAS və iş stansiyası üçün nəzərdə tutulub. Auto-negotiation 2.5G/1G/100M; 12 V adapter, 2 il rəsmi zəmanət və çatdırılma ilə orijinal QNAP modelidir.',
  },
  'QSW-1108-8T': {
    seoTitle: 'QNAP QSW-1108-8T 2.5GbE kommutator',
    seoDescription:
      'QNAP QSW-1108-8T: 8×2.5GbE unmanaged, 40 Gbps və fanless korpus. Çox cihazlı ofis üçün orijinal QNAP kommutator. Rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'QNAP QSW-1108-8T (QSW-1108-8T) 8 × 2.5GbE RJ45 portlu unmanaged kommutatordur. 40 Gbps keçid tutumu, 16K MAC, 12K jumbo frame və fanless desktop korpus 2.5GbE NAS, kompüter və kamera üçün uyğundur. 12 V adapter, maks. 18 W; 2 il rəsmi zəmanət və çatdırılma ilə orijinal QNAP modelidir.',
  },
  'TR-002': {
    seoTitle: 'QNAP TR-002 2-bay USB DAS',
    seoDescription:
      'QNAP TR-002: 2-bay USB hardware RAID DAS, hot-swap SATA yuvalar. NAS və PC genişlənməsi üçün orijinal QNAP DAS. Rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'QNAP TR-002 (TR-002) 2-bay USB hardware RAID DAS-dır. 2 × 3.5"/2.5" SATA 6Gb/s hot-swap yuva, key lock və USB 3.2 interfeys NAS, Windows və macOS üçün əlavə yaddaş verir. RAID 0/1/JBOD hardware səviyyəsində işləyir; tower korpus, 36 W adapter, 2 il rəsmi zəmanət və çatdırılma ilə orijinal QNAP modelidir.',
  },
  'TR-004': {
    seoTitle: 'QNAP TR-004 4-bay USB DAS',
    seoDescription:
      'QNAP TR-004: 4-bay USB hardware RAID DAS, hot-swap SATA və USB 3.2. Ofis yaddaşı üçün orijinal QNAP DAS, 2 il rəsmi zəmanət və çatdırılma, RAID 5 ilə.',
    pageIntro:
      'QNAP TR-004 (TR-004) 4-bay USB hardware RAID DAS-dır. 4 × 3.5"/2.5" SATA hot-swap yuva, key lock və USB 3.2 interfeys NAS və kompüter üçün tutumlu xarici massivdir. RAID 0/1/5/10/JBOD hardware səviyyəsində idarə olunur; tower korpus, 60 W adapter, 2 il rəsmi zəmanət və çatdırılma ilə orijinal QNAP modelidir.',
  },
  'TS-133': {
    seoTitle: 'QNAP TS-133 1-bay tower NAS',
    seoDescription:
      'QNAP TS-133: 1-bay tower NAS, ARM Cortex-A55, 2 GB RAM və 1GbE. Ev backup üçün orijinal QNAP, 2 il rəsmi zəmanət və çatdırılma, USB 3.2 ilə.',
    pageIntro:
      'QNAP TS-133 (TS-133) 1-bay tower NAS-dır. ARM Cortex-A55 4-core 1.8 GHz, 2 GB onboard RAM və 1 × 1GbE RJ45 ev backup və media üçün nəzərdə tutulub. 1 × 3.5"/2.5" SATA, USB 3.2 Gen 1 və QTS ilə orijinal QNAP modelidir; 2 il rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'TS-216G': {
    seoTitle: 'QNAP TS-216G 2-bay tower NAS',
    seoDescription:
      'QNAP TS-216G: 2-bay NAS, Cortex-A55, 4 GB RAM, NPU və 2.5GbE. Ev-ofis yaddaşı üçün orijinal QNAP, 2 il rəsmi zəmanət və çatdırılma, USB Copy ilə.',
    pageIntro:
      'QNAP TS-216G (TS-216G) 2-bay tower NAS-dır. ARM Cortex-A55 4-core 2.0 GHz, Mali-G52, NPU və 4 GB onboard RAM ev və kiçik ofis üçündür. 1 × 2.5GbE + 1 × 1GbE, 2 × hot-swap SATA və USB Copy ilə orijinal QNAP modelidir; 2 il rəsmi zəmanət və çatdırılma ilə.',
  },
  'TS-233': {
    seoTitle: 'QNAP TS-233 2-bay tower NAS',
    seoDescription:
      'QNAP TS-233: 2-bay tower NAS, ARM Cortex-A55 2.0 GHz və 2 GB RAM. Ev yaddaşı üçün orijinal QNAP, 2 il rəsmi zəmanət və çatdırılma, USB Copy ilə.',
    pageIntro:
      'QNAP TS-233 (TS-233) 2-bay tower NAS-dır. ARM Cortex-A55 4-core 2.0 GHz, Mali-G52 hardware transcoding və 2 GB onboard RAM ev və kiçik ofis yaddaşı üçündür. 1 × 1GbE, USB 3.2 Gen 1 və 2 il rəsmi zəmanətlə orijinal QNAP modelidir; çatdırılma ilə təqdim olunur.',
  },
  'TS-264-8G': {
    seoTitle: 'QNAP TS-264-8G 2-bay NAS',
    seoDescription:
      'QNAP TS-264-8G: 2-bay NAS, Celeron N5095, 8 GB RAM, 2×2.5GbE və HDMI. Kiçik ofis üçün orijinal QNAP, 3 il rəsmi zəmanət və çatdırılma, M.2 NVMe ilə.',
    pageIntro:
      'QNAP TS-264-8G (TS-264-8G) 2-bay tower NAS-dır. Intel Celeron N5095 4C/4T (burst 2.9 GHz), 8 GB DDR4 (maks. 16 GB), 2 × 2.5GbE və HDMI multimedia ofisi üçündür. 2 × M.2 NVMe cache, PCIe Gen3 x2 (10GbE opsional) və 3 il rəsmi zəmanətlə orijinal QNAP modelidir; çatdırılma ilə.',
  },
  'TS-364-8G': {
    seoTitle: 'QNAP TS-364-8G 3-bay NAS',
    seoDescription:
      'QNAP TS-364-8G: 3-bay NAS, Celeron N5095, 8 GB RAM və 2.5GbE. RAID 5 ofis yaddaşı üçün orijinal QNAP, 2 il rəsmi zəmanət və çatdırılma, M.2 NVMe ilə.',
    pageIntro:
      'QNAP TS-364-8G (TS-364-8G) 3-bay tower NAS-dır. Intel Celeron N5095 4C/4T, 8 GB RAM, 1 × 2.5GbE və HDMI üç disklə RAID 5 üçün nəzərdə tutulub. 2 × M.2 NVMe cache və USB 3.2 Gen 2 ilə orijinal QNAP modelidir; 2 il rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'TS-433-4G': {
    seoTitle: 'QNAP TS-433-4G 4-bay NAS',
    seoDescription:
      'QNAP TS-433-4G: 4-bay NAS, Cortex-A55, 4 GB RAM və 2.5GbE+1GbE. Ailə ofisi üçün orijinal QNAP, 2 il rəsmi zəmanət və çatdırılma, USB Copy ilə.',
    pageIntro:
      'QNAP TS-433-4G (TS-433-4G) 4-bay tower NAS-dır. ARM Cortex-A55 4-core 2.0 GHz, Mali-G52 NPU və 4 GB onboard RAM ailə və kiçik ofis yaddaşı üçündür. 1 × 2.5GbE + 1 × 1GbE, 4 × hot-swap SATA və USB Copy ilə orijinal QNAP modelidir; 2 il rəsmi zəmanət və çatdırılma ilə.',
  },
  'TS-453E-8G': {
    seoTitle: 'QNAP TS-453E-8G 4-bay NAS',
    seoDescription:
      'QNAP TS-453E-8G: 4-bay NAS, Celeron J6412, 8 GB RAM, 2×2.5GbE və HDMI. Ofis üçün orijinal QNAP, 3 il rəsmi zəmanət və çatdırılma, M.2 NVMe ilə.',
    pageIntro:
      'QNAP TS-453E-8G (TS-453E-8G) 4-bay tower NAS-dır. Intel Celeron J6412 4C/4T 2.0–2.6 GHz, 8 GB DDR4 (maks. 16 GB), 2 × 2.5GbE və HDMI 4K çıxış ofis multimedia üçündür. 2 × M.2 NVMe cache və 3 il rəsmi zəmanətlə orijinal QNAP modelidir; çatdırılma ilə təqdim olunur.',
  },
  'TS-464-8G': {
    seoTitle: 'QNAP TS-464-8G 4-bay NAS',
    seoDescription:
      'QNAP TS-464-8G: 4-bay NAS, Celeron N5095, 8 GB RAM, 2×2.5GbE və PCIe. Ofis yaddaşı üçün orijinal QNAP, 3 il rəsmi zəmanət və çatdırılma, M.2 NVMe ilə.',
    pageIntro:
      'QNAP TS-464-8G (TS-464-8G) 4-bay tower NAS-dır. Intel Celeron N5095 4C/4T, 8 GB DDR4 (maks. 16 GB), 2 × 2.5GbE, HDMI və PCIe Gen3 x2 (10GbE opsional) kiçik ofis üçündür. 2 × M.2 NVMe cache, hot-swap SATA və 3 il rəsmi zəmanətlə orijinal QNAP modelidir; çatdırılma ilə.',
  },
  'TS-473A-8G': {
    seoTitle: 'QNAP TS-473A-8G 4-bay NAS',
    seoDescription:
      'QNAP TS-473A-8G: 4-bay NAS, Ryzen V1500B, 8 GB ECC RAM və 2×PCIe. Pro ofis üçün orijinal QNAP, 3 il rəsmi zəmanət və çatdırılma, M.2 NVMe ilə.',
    pageIntro:
      'QNAP TS-473A-8G (TS-473A-8G) 4-bay tower NAS-dır. AMD Ryzen Embedded V1500B 4C/8T 2.2 GHz, 8 GB DDR4 (maks. 64 GB, ECC), 2 × 2.5GbE və 2 × PCIe Gen3 x4 10/25GbE və GPU üçün nəzərdə tutulub. 2 × M.2 NVMe, 250 W PSU və 3 il rəsmi zəmanətlə orijinal QNAP modelidir.',
  },
  'TS-AI642-8G': {
    seoTitle: 'QNAP TS-AI642-8G 6-bay AI NAS',
    seoDescription:
      'QNAP TS-AI642-8G: 6-bay AI NAS, 8-core ARM, NPU 6 TOPS və 2.5GbE. Ağıllı yaddaş üçün orijinal QNAP, 3 il rəsmi zəmanət və çatdırılma, HDMI çıxış.',
    pageIntro:
      'QNAP TS-AI642-8G (TS-AI642-8G) 6-bay AI tower NAS-dır. 8-core ARM (Cortex-A76 + A55), Mali-G610, NPU 6 TOPS və 8 GB onboard RAM foto/video axtarışı üçündür. 1 × 2.5GbE + 2 × 1GbE, PCIe Gen3 x2, HDMI və 6 × hot-swap SATA ilə orijinal QNAP modelidir; 3 il rəsmi zəmanət və çatdırılma ilə.',
  },
  'TS-632X-4G': {
    seoTitle: 'QNAP TS-632X-4G 6-bay NAS',
    seoDescription:
      'QNAP TS-632X-4G: 6-bay NAS, 2×10GbE SFP+ və 2×2.5GbE, ECC RAM. Sürətli ofis yaddaşı üçün orijinal QNAP, 2 il rəsmi zəmanət və çatdırılma, PCIe Gen3 x4.',
    pageIntro:
      'QNAP TS-632X-4G (TS-632X-4G) 6-bay tower NAS-dır. Annapurna Labs Alpine AL524 4-core 2.0 GHz, 4 GB DDR4 (maks. 16 GB, ECC), 2 × 10GbE SFP+ və 2 × 2.5GbE sürətli ofis backup üçündür. PCIe Gen3 x4, 6 × hot-swap SATA və 2 il rəsmi zəmanətlə orijinal QNAP modelidir; çatdırılma ilə.',
  },
  'TS-664-8G': {
    seoTitle: 'QNAP TS-664-8G 6-bay NAS',
    seoDescription:
      'QNAP TS-664-8G: 6-bay NAS, Celeron N5095, 8 GB RAM, 2×2.5GbE və HDMI. Ofis üçün orijinal QNAP, 3 il rəsmi zəmanət və çatdırılma, M.2 NVMe ilə.',
    pageIntro:
      'QNAP TS-664-8G (TS-664-8G) 6-bay tower NAS-dır. Intel Celeron N5095 4C/4T, 8 GB DDR4 (maks. 16 GB), 2 × 2.5GbE, HDMI və PCIe Gen3 x2 kiçik-orta ofis üçündür. 2 × M.2 NVMe cache, 6 × hot-swap SATA və 3 il rəsmi zəmanətlə orijinal QNAP modelidir; çatdırılma ilə təqdim olunur.',
  },
  'TS-673A-8G': {
    seoTitle: 'QNAP TS-673A-8G 6-bay NAS',
    seoDescription:
      'QNAP TS-673A-8G: 6-bay NAS, Ryzen V1500B, 8 GB ECC RAM və 2×PCIe. Pro yaddaş üçün orijinal QNAP, 3 il rəsmi zəmanət və çatdırılma, M.2 NVMe ilə.',
    pageIntro:
      'QNAP TS-673A-8G (TS-673A-8G) 6-bay tower NAS-dır. AMD Ryzen Embedded V1500B 4C/8T 2.2 GHz, 8 GB DDR4 (maks. 64 GB, ECC), 2 × 2.5GbE və 2 × PCIe Gen3 x4 10/25GbE və QM2 üçün nəzərdə tutulub. 2 × M.2 NVMe, 250 W PSU və 3 il rəsmi zəmanətlə orijinal QNAP modelidir.',
  },
  'TS-832PX-4G': {
    seoTitle: 'QNAP TS-832PX-4G 8-bay NAS',
    seoDescription:
      'QNAP TS-832PX-4G: 8-bay NAS, 2×10GbE SFP+ və 2×2.5GbE. Tutumlu ofis yaddaşı üçün orijinal QNAP, 2 il rəsmi zəmanət və çatdırılma, USB Copy ilə.',
    pageIntro:
      'QNAP TS-832PX-4G (TS-832PX-4G) 8-bay tower NAS-dır. Annapurna Labs Alpine AL324 Cortex-A57 4-core 1.7 GHz, 4 GB DDR4 (maks. 16 GB), 2 × 10GbE SFP+ və 2 × 2.5GbE tutumlu ofis yaddaşı üçündür. PCIe Gen2 x2, USB Copy, 250 W PSU və 2 il rəsmi zəmanətlə orijinal QNAP modelidir; çatdırılma ilə.',
  },
  'TS-873A-8G': {
    seoTitle: 'QNAP TS-873A-8G 8-bay NAS',
    seoDescription:
      'QNAP TS-873A-8G: 8-bay NAS, Ryzen V1500B, 8 GB ECC RAM və 2×PCIe. Pro tower üçün orijinal QNAP, 3 il rəsmi zəmanət və çatdırılma, M.2 NVMe ilə.',
    pageIntro:
      'QNAP TS-873A-8G (TS-873A-8G) 8-bay tower NAS-dır. AMD Ryzen Embedded V1500B 4C/8T 2.2 GHz, 8 GB DDR4 (maks. 64 GB, ECC), 2 × 2.5GbE və 2 × PCIe Gen3 x4 yüksək tutumlu ofis üçündür. 2 × M.2 NVMe, 250 W PSU və 3 il rəsmi zəmanətlə orijinal QNAP modelidir; çatdırılma ilə təqdim olunur.',
  },
  'TS-432PXU-2G': {
    seoTitle: 'QNAP TS-432PXU-2G 4-bay rack NAS',
    seoDescription:
      'QNAP TS-432PXU-2G: 4-bay 1U rack NAS, 2×10GbE SFP+ və tək PSU. Şkaf yaddaşı üçün orijinal QNAP, 3 il rəsmi zəmanət və çatdırılma, Hot-swap SATA.',
    pageIntro:
      'QNAP TS-432PXU-2G (TS-432PXU-2G) 4-bay 1U rackmount NAS-dır. Annapurna Labs Alpine AL324 4-core 1.7 GHz, 2 GB DDR4 (maks. 16 GB), 2 × 10GbE SFP+ və 2 × 2.5GbE kiçik server şkafı üçündür. Tək 250 W PSU, PCIe Gen2 x2 və 3 il rəsmi zəmanətlə orijinal QNAP modelidir; çatdırılma ilə.',
  },
  'TS-432PXU-RP-2G': {
    seoTitle: 'QNAP TS-432PXU-RP 4-bay rack NAS',
    seoDescription:
      'QNAP TS-432PXU-RP-2G: 4-bay 1U NAS, 2×10GbE SFP+ və redundant PSU. Şkaf üçün orijinal QNAP, 3 il rəsmi zəmanət və çatdırılma, Hot-swap SATA.',
    pageIntro:
      'QNAP TS-432PXU-RP-2G (TS-432PXU-RP-2G) 4-bay 1U rackmount NAS-dır. Annapurna Labs Alpine AL324 4-core 1.7 GHz, 2 GB DDR4 (maks. 16 GB), 2 × 10GbE SFP+ və 2 × 2.5GbE. 2 × 250 W redundant PSU kəsintisiz şkaf işi üçündür. PCIe Gen2 x2 və 3 il rəsmi zəmanətlə orijinal QNAP modelidir; çatdırılma ilə.',
  },
  'TS-464EU-8G': {
    seoTitle: 'QNAP TS-464eU-8G 4-bay 1U NAS',
    seoDescription:
      'QNAP TS-464eU-8G: 4-bay short-depth 1U NAS, Celeron N5095 və 2×2.5GbE. Dayaz şkaf üçün orijinal QNAP, 3 il rəsmi zəmanət və çatdırılma, M.2 NVMe ilə.',
    pageIntro:
      'QNAP TS-464eU-8G (TS-464eU-8G) 4-bay short-depth 1U rackmount NAS-dır. Intel Celeron N5095 4C/4T, 8 GB DDR4 (maks. 16 GB), 2 × 2.5GbE, HDMI və M.2 NVMe cache dayaz şkaf üçündür. Dərinlik 292 mm, 100 W PSU və 3 il rəsmi zəmanətlə orijinal QNAP modelidir; çatdırılma ilə təqdim olunur.',
  },
  'TS-464U-RP-8G': {
    seoTitle: 'QNAP TS-464U-RP-8G 4-bay 1U NAS',
    seoDescription:
      'QNAP TS-464U-RP-8G: 4-bay 1U NAS, Celeron N5095, PCIe və redundant PSU. Şkaf üçün orijinal QNAP, 3 il rəsmi zəmanət və çatdırılma, HDMI çıxış.',
    pageIntro:
      'QNAP TS-464U-RP-8G (TS-464U-RP-8G) 4-bay 1U rackmount NAS-dır. Intel Celeron N5095 4C/4T, 8 GB DDR4 (maks. 16 GB), 2 × 2.5GbE, HDMI və PCIe Gen3 x2 (10GbE opsional). 2 × 250 W redundant PSU və 3 il rəsmi zəmanətlə orijinal QNAP modelidir; çatdırılma ilə təqdim olunur.',
  },
  'TS-832PXU-4G': {
    seoTitle: 'QNAP TS-832PXU-4G 8-bay rack NAS',
    seoDescription:
      'QNAP TS-832PXU-4G: 8-bay 2U rack NAS, 2×10GbE SFP+ və tək PSU. Orta tutum üçün orijinal QNAP, 3 il rəsmi zəmanət və çatdırılma, Hot-swap SATA.',
    pageIntro:
      'QNAP TS-832PXU-4G (TS-832PXU-4G) 8-bay 2U rackmount NAS-dır. Annapurna Labs Alpine AL324 4-core 1.7 GHz, 4 GB DDR4 (maks. 16 GB), 2 × 10GbE SFP+ və 2 × 2.5GbE orta tutumlu ofis yaddaşı üçündür. Tək 250 W PSU, PCIe Gen2 x2 və 3 il rəsmi zəmanətlə orijinal QNAP modelidir.',
  },
  'TS-832PXU-RP-4G': {
    seoTitle: 'QNAP TS-832PXU-RP 8-bay rack NAS',
    seoDescription:
      'QNAP TS-832PXU-RP-4G: 8-bay 2U NAS, 2×10GbE SFP+ və redundant PSU. Şkaf üçün orijinal QNAP, 3 il rəsmi zəmanət və çatdırılma, Hot-swap SATA.',
    pageIntro:
      'QNAP TS-832PXU-RP-4G (TS-832PXU-RP-4G) 8-bay 2U rackmount NAS-dır. Annapurna Labs Alpine AL324 4-core 1.7 GHz, 4 GB DDR4 (maks. 16 GB), 2 × 10GbE SFP+ və 2 × 2.5GbE. 2 × 250 W redundant PSU kəsintisiz şkaf işi üçündür. PCIe Gen2 x2 və 3 il rəsmi zəmanətlə orijinal QNAP modelidir; çatdırılma ilə.',
  },
  'TS-864EU-RP-8G': {
    seoTitle: 'QNAP TS-864eU-RP 8-bay 2U NAS',
    seoDescription:
      'QNAP TS-864eU-RP-8G: 8-bay short-depth 2U NAS, Celeron N5095 və RP PSU. Dayaz şkaf üçün orijinal QNAP, 3 il rəsmi zəmanət və çatdırılma, HDMI çıxış.',
    pageIntro:
      'QNAP TS-864eU-RP-8G (TS-864eU-RP-8G) 8-bay short-depth 2U rackmount NAS-dır. Intel Celeron N5095 4C/4T, 8 GB DDR4 (maks. 16 GB), 2 × 2.5GbE, HDMI və PCIe Gen3 x2 dayaz şkaf üçündür. Dərinlik 297 mm, 2 × 300 W redundant PSU və 3 il rəsmi zəmanətlə orijinal QNAP modelidir.',
  },
  'TS-873AEU-4G': {
    seoTitle: 'QNAP TS-873AeU-4G 8-bay NAS',
    seoDescription:
      'QNAP TS-873AeU-4G: 8-bay 2U short-depth NAS, Ryzen V1500B və tək PSU. Şkaf üçün orijinal QNAP, 3 il rəsmi zəmanət və çatdırılma, M.2 NVMe ilə.',
    pageIntro:
      'QNAP TS-873AeU-4G (TS-873AeU-4G) 8-bay short-depth 2U rackmount NAS-dır. AMD Ryzen Embedded V1500B 4-core/8-thread 2.2 GHz, 4 GB DDR4 (maks. 64 GB, ECC) və 2 × 2.5GbE ofis yaddaşı üçündür. 2 × M.2 NVMe cache, PCIe Gen3 x8 (10/25GbE və ya GPU) və QTS/QuTS hero ilə orijinal QNAP modelidir; 3 il rəsmi zəmanət və çatdırılma ilə.',
  },
  'TS-873AEU-RP-4G': {
    seoTitle: 'QNAP TS-873AeU-RP 8-bay rack NAS',
    seoDescription:
      'QNAP TS-873AeU-RP-4G: 8-bay 2U short-depth NAS, Ryzen V1500B və RP PSU. Şkaf üçün orijinal QNAP, 3 il rəsmi zəmanət və çatdırılma, M.2 NVMe ilə.',
    pageIntro:
      'QNAP TS-873AeU-RP-4G (TS-873AeU-RP-4G) 8-bay short-depth 2U rackmount NAS-dır. AMD Ryzen Embedded V1500B 4C/8T 2.2 GHz, 4 GB DDR4 (maks. 64 GB, ECC), 2 × 2.5GbE və PCIe Gen3 x8. 2 × 300 W redundant PSU dayaz şkaf üçündür. 2 × M.2 NVMe və 3 il rəsmi zəmanətlə orijinal QNAP modelidir; çatdırılma ilə.',
  },
  'TS-855EU-RP-8G': {
    seoTitle: 'QNAP TS-855eU-RP 8-bay rack NAS',
    seoDescription:
      'QNAP TS-855eU-RP-8G: 8-bay 2U short-depth NAS, Atom C5125 8-core və RP. Şkaf üçün orijinal QNAP, 3 il rəsmi zəmanət və çatdırılma, M.2 NVMe ilə.',
    pageIntro:
      'QNAP TS-855eU-RP-8G (TS-855eU-RP-8G) 8-bay short-depth 2U rackmount NAS-dır. Intel Atom C5125 8-core 2.8 GHz, 8 GB DDR4 (maks. 64 GB, ECC), 2 × 2.5GbE və 2 × PCIe Gen3 x4 10/25GbE üçün nəzərdə tutulub. 2 × 300 W redundant PSU, M.2 NVMe və 3 il rəsmi zəmanətlə orijinal QNAP modelidir; çatdırılma ilə.',
  },
  'TS-1232PXU-RP-4G': {
    seoTitle: 'QNAP TS-1232PXU-RP 12-bay NAS',
    seoDescription:
      'QNAP TS-1232PXU-RP-4G: 12-bay 2U NAS, 2×10GbE SFP+ və redundant PSU. Tutum üçün orijinal QNAP, 3 il rəsmi zəmanət və çatdırılma, Hot-swap SATA.',
    pageIntro:
      'QNAP TS-1232PXU-RP-4G (TS-1232PXU-RP-4G) 12-bay 2U rackmount NAS-dır. Annapurna Labs Alpine AL324 4-core 1.7 GHz, 4 GB DDR4 (maks. 16 GB), 2 × 10GbE SFP+ və 2 × 2.5GbE tutumlu şkaf yaddaşı üçündür. 2 × 250 W redundant PSU, PCIe Gen2 x2 və 3 il rəsmi zəmanətlə orijinal QNAP modelidir.',
  },
  'TS-1264U-RP-8G': {
    seoTitle: 'QNAP TS-1264U-RP-8G 12-bay NAS',
    seoDescription:
      'QNAP TS-1264U-RP-8G: 12-bay 2U NAS, Celeron N5095, HDMI və redundant PSU. Şkaf üçün orijinal QNAP, 3 il rəsmi zəmanət və çatdırılma, HDMI çıxış.',
    pageIntro:
      'QNAP TS-1264U-RP-8G (TS-1264U-RP-8G) 12-bay 2U rackmount NAS-dır. Intel Celeron N5095 4C/4T, 8 GB DDR4 (maks. 16 GB), 2 × 2.5GbE, HDMI və PCIe Gen3 x2 (10GbE opsional). 2 × 300 W redundant PSU və 3 il rəsmi zəmanətlə orijinal QNAP modelidir; çatdırılma ilə təqdim olunur.',
  },
  'TS-1273AU-RP-8G': {
    seoTitle: 'QNAP TS-1273AU-RP-8G 12-bay NAS',
    seoDescription:
      'QNAP TS-1273AU-RP-8G: 12-bay 2U NAS, Ryzen V1500B, 8 GB ECC RAM və 2×PCIe. Şkaf üçün orijinal QNAP, 3 il rəsmi zəmanət və çatdırılma, QM2 PCIe.',
    pageIntro:
      'QNAP TS-1273AU-RP-8G (TS-1273AU-RP-8G) 12-bay 2U rackmount NAS-dır. AMD Ryzen Embedded V1500B 4C/8T 2.2 GHz, 8 GB DDR4 (maks. 64 GB, ECC), 2 × 2.5GbE və 2 × PCIe Gen3 x4 10GbE/QM2 üçün nəzərdə tutulub. 2 × 300 W redundant PSU və 3 il rəsmi zəmanətlə orijinal QNAP modelidir; çatdırılma ilə.',
  },
  'TS-1273AU-RP-8GB': {
    seoTitle: 'QNAP TS-1273AU-RP-8GB 12-bay NAS',
    seoDescription:
      'QNAP TS-1273AU-RP-8GB: 12-bay 2U NAS, Ryzen V1500B və 8 GB RAM kanal SKU. Orijinal QNAP, 3 il rəsmi zəmanət və çatdırılma, QM2 PCIe genişlənmə ilə.',
    pageIntro:
      'QNAP TS-1273AU-RP-8GB (TS-1273AU-RP-8GB) 12-bay 2U rackmount NAS-ın 8 GB RAM kanal SKU-sudur. AMD Ryzen Embedded V1500B 4C/8T 2.2 GHz, 8 GB DDR4 (maks. 64 GB, ECC), 2 × 2.5GbE və 2 × PCIe Gen3 x4. TS-1273AU-RP-8G ilə eyni şassi; 2 × 300 W redundant PSU və 3 il rəsmi zəmanətlə orijinal QNAP modelidir.',
  },
  'TS-H1277AXU-RP-R5-16G': {
    seoTitle: 'QNAP TS-h1277AXU-RP R5 12-bay',
    seoDescription:
      'QNAP TS-h1277AXU-RP-R5-16G: 12-bay QuTS hero, Ryzen 5 və 2×10GBASE-T. Enterprise şkaf üçün orijinal QNAP, 5 il rəsmi zəmanət və çatdırılma, 16 GB DDR5.',
    pageIntro:
      'QNAP TS-h1277AXU-RP-R5-16G 12-bay 2U enterprise NAS-dır (QuTS hero). AMD Ryzen 5 7000 6C/12T, 16 GB DDR5 (maks. 192 GB), 2 × 10GBASE-T + 2 × 2.5GbE və 3 × PCIe Gen4. 2 × 550 W redundant PSU, 5 il rəsmi zəmanət; rels dəstəyində deyil (RAIL-B02). Orijinal QNAP modelidir, çatdırılma ilə.',
  },
  'TS-H1277AXU-RP-R7-32G': {
    seoTitle: 'QNAP TS-h1277AXU-RP R7 12-bay',
    seoDescription:
      'QNAP TS-h1277AXU-RP-R7-32G: 12-bay QuTS hero, Ryzen 7 və 32 GB DDR5. Enterprise şkaf üçün orijinal QNAP, 5 il rəsmi zəmanət və çatdırılma, Ryzen 7.',
    pageIntro:
      'QNAP TS-h1277AXU-RP-R7-32G 12-bay 2U enterprise NAS-dır (QuTS hero). AMD Ryzen 7 7000 8C/16T, 32 GB DDR5 (maks. 192 GB), 2 × 10GBASE-T + 2 × 2.5GbE və 3 × PCIe Gen4. 2 × 550 W redundant PSU və 5 il rəsmi zəmanətlə orijinal QNAP modelidir; rels ayrıca (RAIL-B02), çatdırılma ilə təqdim olunur.',
  },
  'TS-H1677AXU-RP-R7-32G': {
    seoTitle: 'QNAP TS-h1677AXU-RP 16-bay NAS',
    seoDescription:
      'QNAP TS-h1677AXU-RP-R7-32G: 16-bay 3U QuTS hero, Ryzen 7 və 2×10GBASE-T. Datacenter üçün orijinal QNAP, 5 il rəsmi zəmanət və çatdırılma, 3U rack.',
    pageIntro:
      'QNAP TS-h1677AXU-RP-R7-32G 16-bay 3U enterprise NAS-dır (QuTS hero). AMD Ryzen 7 7000 8C/16T, 32 GB DDR5 (maks. 192 GB), 2 × 10GBASE-T + 2 × 2.5GbE və 3 × PCIe Gen4 tutumlu datacenter yaddaşı üçündür. 2 × 550 W redundant PSU və 5 il rəsmi zəmanətlə orijinal QNAP modelidir; çatdırılma ilə.',
  },
  'TS-H1887XU-RP-E2334-16G': {
    seoTitle: 'QNAP TS-h1887XU-RP 18-bay NAS',
    seoDescription:
      'QNAP TS-h1887XU-RP-E2334-16G: 18-bay hybrid QuTS hero, Xeon E-2334 və ECC. Enterprise üçün orijinal QNAP, 5 il rəsmi zəmanət və çatdırılma, Hybrid 18-bay.',
    pageIntro:
      'QNAP TS-h1887XU-RP-E2334-16G 18-bay 2U hybrid enterprise NAS-dır (QuTS hero). Intel Xeon E-2334 4C/8T, 16 GB ECC DDR4 (maks. 128 GB), 12 × 3.5" + 6 × 2.5" SATA, 2 × 10GBASE-T + 2 × 2.5GbE və 3 × PCIe Gen4. 2 × 550 W redundant PSU və 5 il rəsmi zəmanətlə orijinal QNAP modelidir.',
  },
  'TRX-10GITSFPP-SR': {
    seoTitle: 'QNAP TRX-10GITSFPP-SR SFP+ modul',
    seoDescription:
      'QNAP TRX-10GITSFPP-SR: 10GBASE-SR SFP+ transceiver, 850 nm və 300 m. NAS 10GbE üçün orijinal QNAP modul, 1 il rəsmi zəmanət və çatdırılma, LC duplex.',
    pageIntro:
      'QNAP TRX-10GITSFPP-SR (TRX-10GITSFPP-SR) 10GbE SFP+ SR optik transceivendir. 10GBASE-SR, 850 nm, LC duplex və OM3/OM4 multimode ilə 300 m-ə qədər. Sənaye temperaturu −40 °C ~ 85 °C; QNAP 10GbE SFP+ portları üçün orijinal modul, 1 il rəsmi zəmanət və çatdırılma ilə.',
  },
  'TRX-25GSFP28-SR': {
    seoTitle: 'QNAP TRX-25GSFP28-SR SFP28 modul',
    seoDescription:
      'QNAP TRX-25GSFP28-SR: 25GBASE-SR SFP28 transceiver, 850 nm və 100 m. NAS 25GbE üçün orijinal QNAP modul, 1 il rəsmi zəmanət və çatdırılma, LC duplex.',
    pageIntro:
      'QNAP TRX-25GSFP28-SR (TRX-25GSFP28-SR) 25GbE SFP28 SR optik transceivendir. 25GBASE-SR, 850 nm, LC duplex və OM4 multimode ilə 100 m-ə qədər. QNAP 25GbE SFP28 portları üçün orijinal modul; 1 il rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'QXG-10G1T': {
    seoTitle: 'QNAP QXG-10G1T 10GbE adapter',
    seoDescription:
      'QNAP QXG-10G1T: tək port 10GBASE-T PCIe Gen3 x4 kart, AQC107. NAS üçün orijinal QNAP adapter, 3 il rəsmi zəmanət və çatdırılma, Cat 6 kabel.',
    pageIntro:
      'QNAP QXG-10G1T (QXG-10G1T) tək port 10GbE şəbəkə genişləndirmə kartıdır. Marvell AQtion AQC107, 1 × 10GBASE-T RJ45 (10G/5G/2.5G/1G/100M), PCIe Gen3 x4 və low-profile bracket QNAP NAS (QTS/QuTS hero 5.0+) üçündür. Cat 6 kabel; 3 il rəsmi zəmanət və çatdırılma ilə orijinal QNAP adapteridir.',
  },
  'QXG-25G2SF-E810': {
    seoTitle: 'QNAP QXG-25G2SF-E810 25GbE kart',
    seoDescription:
      'QNAP QXG-25G2SF-E810: dual-port 25GbE SFP28, Intel E810 və PCIe Gen4 x8. NAS üçün orijinal QNAP adapter, 3 il rəsmi zəmanət və çatdırılma, Ubuntu/Win.',
    pageIntro:
      'QNAP QXG-25G2SF-E810 (QXG-25G2SF-E810) dual-port 25GbE şəbəkə kartıdır. Intel E810-XXVAM2, 2 × SFP28 (25G/10G), PCIe Gen4 x8 və low-profile bracket QNAP NAS, Windows və Ubuntu üçündür. 3 il rəsmi zəmanət və çatdırılma ilə orijinal QNAP adapteridir.',
  },
  'QXG-2G2T-I225': {
    seoTitle: 'QNAP QXG-2G2T-I225 2.5GbE kart',
    seoDescription:
      'QNAP QXG-2G2T-I225: dual-port 2.5GbE PCIe kart, Intel I225-LM. NAS və PC üçün orijinal QNAP adapter, 2 il rəsmi zəmanət və çatdırılma, PXE/WoL.',
    pageIntro:
      'QNAP QXG-2G2T-I225 (QXG-2G2T-I225) dual-port 2.5GbE şəbəkə kartıdır. Intel I225-LM, 2 × RJ45 (2.5G/1G/100M/10M), PCIe Gen2 x2, PXE, WoL, 9K jumbo və TSN QNAP NAS və iş stansiyası üçündür. 2 il rəsmi zəmanət və çatdırılma ilə orijinal QNAP adapteridir.',
  },
  'QM2-2P-244A': {
    seoTitle: 'QNAP QM2-2P-244A M.2 NVMe kart',
    seoDescription:
      'QNAP QM2-2P-244A: dual M.2 NVMe, PCIe Gen2 x4 host və qısa PCB. NAS cache üçün orijinal QNAP kart, 1 il rəsmi zəmanət və çatdırılma, Low-profile.',
    pageIntro:
      'QNAP QM2-2P-244A (QM2-2P-244A) dual M.2 NVMe PCIe genişləndirmə kartıdır. 2 × M.2 22110/2280 PCIe Gen2 x4 NVMe, host PCIe Gen2 x4 və qısa PCB TVS-x82/TS-x77 slot 2/3 üçün nəzərdə tutulub. Low-profile bracket dəstdə; 1 il rəsmi zəmanət və çatdırılma ilə orijinal QNAP NAS aksesuarıdır.',
  },
  'QM2-2P-344A': {
    seoTitle: 'QNAP QM2-2P-344A M.2 NVMe kart',
    seoDescription:
      'QNAP QM2-2P-344A: dual M.2 NVMe, PCIe Gen3 x4 host. NAS SSD cache üçün orijinal QNAP kart, 1 il rəsmi zəmanət və çatdırılma, Low-profile bracket dəstdə.',
    pageIntro:
      'QNAP QM2-2P-344A (QM2-2P-344A) dual M.2 NVMe PCIe genişləndirmə kartıdır. 2 × M.2 22110/2280 PCIe Gen3 x4 NVMe və host PCIe Gen3 x4 QNAP NAS cache/Qtier üçündür. Low-profile və full-height bracket dəstdə; 1 il rəsmi zəmanət və çatdırılma ilə orijinal QNAP aksesuarıdır.',
  },
  'QM2-2P-384A': {
    seoTitle: 'QNAP QM2-2P-384A M.2 NVMe kart',
    seoDescription:
      'QNAP QM2-2P-384A: dual M.2 NVMe, PCIe Gen3 x8 host. Daha geniş zolaq üçün orijinal QNAP kart, 1 il rəsmi zəmanət və çatdırılma, Low-profile.',
    pageIntro:
      'QNAP QM2-2P-384A (QM2-2P-384A) dual M.2 NVMe PCIe genişləndirmə kartıdır. 2 × M.2 22110/2280 PCIe Gen3 x4 NVMe və host PCIe Gen3 x8 eyni anda iki SSD-yə tam zolaq verir. Low-profile bracket dəstdə; 1 il rəsmi zəmanət və çatdırılma ilə orijinal QNAP NAS aksesuarıdır.',
  },
  'QXG-10G2SF-X710': {
    seoTitle: 'QNAP QXG-10G2SF-X710 10GbE adapter',
    seoDescription:
      'QNAP QXG-10G2SF-X710: dual-port SFP+ 10GbE PCIe Gen3 x8 kart. NAS üçün orijinal QNAP adapter, SR-IOV. Rəsmi zəmanət və çatdırılma, 3 il zəmanət.',
    pageIntro:
      'QNAP QXG-10G2SF-X710 (QXG-10G2SF-X710) dual-port 10GbE şəbəkə genişləndirmə kartıdır. 2 × SFP+ (10G/1G), PCIe Gen3 x8, low-profile form faktor və SR-IOV QNAP NAS (QTS/QuTS hero 5.1+), Windows və Ubuntu üçündür. Full-height bracket dəstə ilə gəlir; 3 il rəsmi zəmanət və çatdırılma ilə orijinal QNAP adapteridir.',
  },
  'QNA-UC10G1T': {
    seoTitle: 'QNAP QNA-UC10G1T USB4 10GbE',
    seoDescription:
      'QNAP QNA-UC10G1T: USB4 Type-C → 10GBASE-T adapter, AQC113. Noutbuk üçün orijinal QNAP 10GbE, 2 il rəsmi zəmanət və çatdırılma, Cat 6a kabel.',
    pageIntro:
      'QNAP QNA-UC10G1T (QNA-UC10G1T) USB4 Type-C → 10GBASE-T şəbəkə adapteridir. AQC113 PHY, 1 × USB-C + 1 × 10GBASE-T RJ45 (10G/5G/2.5G/1G/100M) və dəstdə USB4 C-to-C kabel noutbuk və iş stansiyası üçündür. Cat 6a tövsiyə olunur; Windows 11 və Ubuntu 22.04, 2 il rəsmi zəmanət və çatdırılma ilə orijinal QNAP modelidir.',
  },
  'QSW-M2106-4C': {
    seoTitle: 'QNAP QSW-M2106-4C 10GbE kommutator',
    seoDescription:
      'QNAP QSW-M2106-4C: 6×2.5GbE + 4×10G combo web managed switch, 110 Gbps. Ofis üçün orijinal QNAP, 2 il rəsmi zəmanət və çatdırılma, VLAN/LACP.',
    pageIntro:
      'QNAP QSW-M2106-4C (QSW-M2106-4C) 10-port web managed kommutatordur. 6 × 2.5GbE RJ45, 4 × 10GbE SFP+/RJ45 combo və 110 Gbps keçid tutumu NAS aggregation üçündür. VLAN, RSTP, LACP, QoS və LLDP web UI ilə idarə olunur; desktop korpus, 2 il rəsmi zəmanət və çatdırılma ilə orijinal QNAP modelidir.',
  },
  'RAIL-B02': {
    seoTitle: 'QNAP RAIL-B02 rack rels',
    seoDescription:
      'QNAP RAIL-B02: 1U/2U rack slide rels dəsti, TS/TVS U seriyası üçün. QNAP NAS şkafına montaj üçün orijinal aksesuar, 1 il rəsmi zəmanət, 1U/2U rels.',
    pageIntro:
      'QNAP RAIL-B02 (RAIL-B02) 1U/2U QNAP rackmount NAS üçün slide rail dəstidir. TVS-x71U, TS-x53U, TS-x32XU, TS-x64U və oxşar modellərlə uyğundur. Standart dərinlik rack üçün nəzərdə tutulub. Orijinal QNAP NAS aksesuarıdır, 1 il rəsmi zəmanət və çatdırılma ilə.',
  },
  '7212324T-7050000-000-RS': {
    seoTitle: 'QNAP IronWolf 24TB NAS HDD',
    seoDescription:
      'QNAP IronWolf 24TB (7212324T-7050000-000-RS): Seagate IronWolf NAS HDD, SATA 6 Gb/s. QNAP kanallı orijinal disk, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'QNAP IronWolf 24TB (7212324T-7050000-000-RS) Seagate IronWolf NAS HDD-dir; QNAP sifariş kodu ilə satılır. 24 TB 3.5" SATA III (6 Gb/s) disk NAS yaddaşı üçündür. Orijinal QNAP kanallı Seagate IronWolf modelidir; rəsmi zəmanət və çatdırılma ilə.',
  },
  '72123400-6000000-000-RS': {
    seoTitle: 'QNAP IronWolf 4TB NAS HDD',
    seoDescription:
      'QNAP IronWolf 4TB (72123400-6000000-000-RS): Seagate IronWolf NAS HDD, SATA 6 Gb/s. QNAP kanallı orijinal disk, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'QNAP IronWolf 4TB (72123400-6000000-000-RS) Seagate IronWolf NAS HDD-dir; QNAP sifariş kodu ilə satılır. 4 TB 3.5" SATA III (6 Gb/s) disk kiçik ofis NAS üçündür. Orijinal QNAP kanallı Seagate IronWolf modelidir; rəsmi zəmanət və çatdırılma ilə.',
  },
  ST8000VN004: {
    seoTitle: 'QNAP IronWolf 8TB NAS HDD',
    seoDescription:
      'QNAP IronWolf 8TB (ST8000VN004): Seagate IronWolf NAS HDD, SATA 6 Gb/s, 7200 rpm. QNAP kanallı orijinal NAS diski, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'QNAP IronWolf 8TB (ST8000VN004) Seagate IronWolf NAS HDD-dir; QNAP kanallı satış SKU-su ilə təqdim olunur (72123800-6051100-000-RS). 8 TB 3.5" SATA III (6 Gb/s) disk 1–8 yuvalı ofis NAS üçündür. Orijinal QNAP kanallı Seagate IronWolf modelidir; rəsmi zəmanət və çatdırılma ilə.',
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
