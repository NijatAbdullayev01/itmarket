/**
 * Hand-crafted EnGenius catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';
import { normalizeEnGeniusSku } from './engenius-product-name';

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
  ECS1008P: {
    seoTitle: 'EnGenius ECS1008P PoE+ Cloud kommutator',
    seoDescription:
      'EnGenius ECS1008P: 8×GbE PoE+ 55 W, desktop Cloud L2+. Kiçik ofis AP və kamera üçün orijinal EnGenius kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius ECS1008P (ECS1008P) 8 × GbE PoE+ portlu, 55 W PoE büdcəli Cloud Layer 2+ kommutatordur. Desktop/divar korpus və xarici adapter kiçik ofis Wi-Fi və IP kamera üçün nəzərdə tutulub. PoE Extended Mode, PD Lifeguard və Continuous PoE EnGenius Cloud, ezMaster, SkyKey və lokal Web GUI ilə idarə olunur. Orijinal EnGenius Cloud modelidir; rəsmi 5 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  ECS1112FP: {
    seoTitle: 'EnGenius ECS1112FP PoE+ Cloud kommutator',
    seoDescription:
      'EnGenius ECS1112FP: 8×PoE+ 130 W, 2×GbE və 2×SFP uplink. 13" rack ofis AP üçün orijinal EnGenius Cloud kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius ECS1112FP (ECS1112FP) 8 × GbE PoE+ + 2 × GbE access və 2 × 1G SFP uplink-li Cloud Layer 2+ kommutatordur. 130 W PoE büdcəsi, 13" 1U rackmount və daxili PSU kiçik ofis access point və kamera üçün uyğundur. PoE Extended 250 m, PD Lifeguard və Continuous PoE EnGenius Cloud ilə idarə olunur. Orijinal EnGenius Cloud modelidir; rəsmi 5 il zəmanət və çatdırılma ilə.',
  },
  ECS1528P: {
    seoTitle: 'EnGenius ECS1528P Cloud PoE+ kommutator',
    seoDescription:
      'EnGenius ECS1528P: 24×GbE PoE+ 240 W, 4×10G SFP+ və Cloud idarəetmə. PD Lifeguard ilə orijinal EnGenius kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius ECS1528P (ECS1528P) Cloud Managed Layer 2+ PoE+ kommutatordur: 24 × GbE PoE+ (240 W), 4 × 10G SFP+ uplink və 128 Gbps switching. PoE Extended Mode kabel məsafəsini 250 m-ə qədər uzadır; PD Lifeguard uğursuz kameranı avto-reboot edir, Continuous PoE isə yeniləmə zamanı qidanı kəsmir. EnGenius Cloud, SkyKey, ezMaster və standalone Web GUI ilə idarə olunur. Orijinal EnGenius Cloud modelidir; rəsmi 5 il zəmanət və çatdırılma ilə.',
  },
  ECS1528FP: {
    seoTitle: 'EnGenius ECS1528FP Cloud PoE+ kommutator',
    seoDescription:
      'EnGenius ECS1528FP: 24×GbE PoE+ 410 W, 4×10G SFP+ və Cloud L2+. Tam PoE ofis üçün orijinal EnGenius kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius ECS1528FP (ECS1528FP) 24 × GbE PoE+ portlu Cloud Layer 2+ kommutatordur. 410 W PoE büdcəsi, 4 × 10G SFP+ uplink və 128 Gbps switching yüksək sıxlıqlı AP və IP kamera üçün nəzərdə tutulub. 19" 1U rackmount, daxili PSU, PD Lifeguard və Continuous PoE EnGenius Cloud ilə idarə olunur. Orijinal EnGenius Cloud Full PoE modelidir; rəsmi 5 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  ECS1552P: {
    seoTitle: 'EnGenius ECS1552P 48-port Cloud kommutator',
    seoDescription:
      'EnGenius ECS1552P: 48×GbE PoE+ 410 W, 4×10G SFP+. Yüksək sıxlıqlı ofis üçün orijinal EnGenius Cloud kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius ECS1552P (ECS1552P) 48 × GbE PoE+ portlu Cloud Layer 2+ kommutatordur. 410 W PoE, 4 × 10G SFP+ uplink və 176 Gbps switching böyük ofis access üçün nəzərdə tutulub. PD Lifeguard, Continuous PoE və MAC 32K EnGenius Cloud, SkyKey və ezMaster ilə idarə olunur. 19" 1U rackmount, orijinal EnGenius Cloud modelidir; rəsmi 5 il zəmanət və çatdırılma ilə.',
  },
  ECS2552FP: {
    seoTitle: 'EnGenius ECS2552FP Multi-Gig PoE+ kommutator',
    seoDescription:
      'EnGenius ECS2552FP: 32×GbE + 16×2.5G PoE+ 740 W və 4×SFP+ uplink. Wi-Fi 6 AP üçün orijinal EnGenius Cloud kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius ECS2552FP (ECS2552FP) Multi-Gigabit Cloud Layer 2+ PoE+ kommutatordur: 32 × GbE + 16 × 2.5G PoE+, 4 × 10G SFP+ və 740 W PoE. 224 Gbps switching və 802.3bz 2.5G portlar Wi-Fi 6 access point uplink üçün nəzərdə tutulub. PD Lifeguard və Continuous PoE EnGenius Cloud ilə idarə olunur. Orijinal EnGenius Cloud modelidir; rəsmi 5 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  ECS1552FP: {
    seoTitle: 'EnGenius ECS1552FP 48-port 740W kommutator',
    seoDescription:
      'EnGenius ECS1552FP: 48×GbE PoE+ 740 W, 4×10G SFP+ uplink. Tam PoE kampus üçün orijinal EnGenius Cloud kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius ECS1552FP (ECS1552FP) 48 × GbE PoE+ portlu Cloud Layer 2+ kommutatordur. 740 W Full PoE büdcəsi, 4 × 10G SFP+ uplink və 176 Gbps switching yüksək sıxlıqlı AP və kamera üçün nəzərdə tutulub. PD Lifeguard, Continuous PoE və MAC 32K EnGenius Cloud ilə idarə olunur. 19" 1U rackmount, orijinal EnGenius Cloud Full PoE modelidir; rəsmi 5 il zəmanət və çatdırılma ilə.',
  },
  ECS5512F: {
    seoTitle: 'EnGenius ECS5512F 10G SFP+ Cloud kommutator',
    seoDescription:
      'EnGenius ECS5512F: 12×10G SFP+ aggregate, 240 Gbps Cloud L2+. Fiber backbone üçün orijinal EnGenius kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius ECS5512F (ECS5512F) PoE-siz Cloud Layer 2+ 10G aggregate kommutatordur: 12 × 1/10G SFP+, 240 Gbps switching və half-rack 1U korpus. VLAN, QoS və fiber uplink ofis aggregation üçün nəzərdə tutulub. EnGenius Cloud, SkyKey, ezMaster və lokal Web GUI ilə idarə olunur. Orijinal EnGenius Cloud fiber modelidir; rəsmi 5 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'SFP2213-10': {
    seoTitle: 'EnGenius SFP2213-10 1.25G LX SFP',
    seoDescription:
      'EnGenius SFP2213-10: 1.25G 1000BASE-LX, 1310 nm SMF 10 km LC. Kommutator uplink üçün orijinal EnGenius SFP modul, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius SFP2213-10 (SFP2213-10) 1.25 Gbps 1000BASE-LX SFP optik transceivərdir. 1310 nm, single-mode LC və 10 km məsafə EnGenius kommutator SFP yuvası üçün nəzərdə tutulub. Hot-plug SFP forma-faktoru ilə orijinal EnGenius moduludur. Rəsmi 1 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  ECW120: {
    seoTitle: 'EnGenius ECW120 Wi-Fi 5 Cloud AP',
    seoDescription:
      'EnGenius ECW120: Wi-Fi 5 2×2 Cloud tavan AP, 400+867 Mbps, GbE PoE. Ofis Wi-Fi üçün orijinal EnGenius Access Point, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius ECW120 (ECW120) Cloud idarə olunan tavan Access Point-dir. Wi-Fi 5 Wave 2, 2×2:2 MU-MIMO (400 + 867 Mbps), 1 × GbE və 802.3af PoE ofis və otel Wi-Fi üçün nəzərdə tutulub. Mesh, WPA2-Enterprise və EnGenius Cloud App ilə idarə olunur. Orijinal EnGenius Cloud modelidir; rəsmi 5 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'EWS357-FIT': {
    seoTitle: 'EnGenius EWS357-FIT Wi-Fi 6 Fit AP',
    seoDescription:
      'EnGenius EWS357-FIT: Wi-Fi 6 2×2 Fit AP, 574+1200 Mbps, GbE PoE. Kiçik ofis üçün orijinal EnGenius Access Point, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius EWS357-FIT (EWS357-FIT) Fit seriyalı indoor Wi-Fi 6 Access Point-dir. 2×2:2 MU-MIMO (574 + 1 200 Mbps), 1 × GbE, 802.3af PoE və WPA3 kiçik ofis üçün nəzərdə tutulub. FitXpress, FitController və standalone rejimdə idarə olunur. Orijinal EnGenius Fit modelidir; rəsmi 1 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  ECW215: {
    seoTitle: 'EnGenius ECW215 Wi-Fi 6 wall-plate AP',
    seoDescription:
      'EnGenius ECW215: Wi-Fi 6 wall-plate Cloud AP, 575+2400 Mbps, 2×GE. Hotel otağı üçün orijinal EnGenius Access Point, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius ECW215 (ECW215) Cloud idarə olunan wall-plate Wi-Fi 6 Access Point-dir. 2×2:2 (575 + 2 400 Mbps), arxa GbE PoE-in, 2 × client GE və 802.3af PSE-out hotel/MTU otağı üçün nəzərdə tutulub. Mesh, WPA3 və EnGenius Cloud ilə idarə olunur. Orijinal EnGenius Cloud wall-plate modelidir; rəsmi 5 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'EWS356-FIT': {
    seoTitle: 'EnGenius EWS356-FIT Wi-Fi 6 Fit AP',
    seoDescription:
      'EnGenius EWS356-FIT: Wi-Fi 6 2×2 Fit AP, 574+2400 Mbps (160 MHz). Ofis Wi-Fi üçün orijinal EnGenius Access Point, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius EWS356-FIT (EWS356-FIT) Fit indoor Wi-Fi 6 Access Point-dir. 2×2:2 MU-MIMO, 574 Mbps (2.4 GHz) + 2 400 Mbps (5 GHz, 160 MHz), GbE və 802.3af/at PoE ofis Wi-Fi üçün nəzərdə tutulub. FitXpress, FitController və standalone, WPA3 ilə idarə olunur. Orijinal EnGenius Fit modelidir; rəsmi 1 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  EWS357AP: {
    seoTitle: 'EnGenius EWS357AP Wi-Fi 6 Neutron AP',
    seoDescription:
      'EnGenius EWS357AP: Wi-Fi 6 2×2 Neutron AP, 574+1200 Mbps, GbE. EWS kommutator ilə orijinal EnGenius Access Point, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius EWS357AP (EWS357AP) Neutron idarə olunan indoor Wi-Fi 6 Access Point-dir. 2×2:2 (574 + 1 200 Mbps), 1 × GbE və 802.3af PoE ofis Wi-Fi üçün nəzərdə tutulub. ezMaster, EWS wireless switch və lokal Web GUI ilə idarə olunur. Orijinal EnGenius Neutron modelidir; rəsmi 1 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  ECW160: {
    seoTitle: 'EnGenius ECW160 Wi-Fi 5 outdoor AP',
    seoDescription:
      'EnGenius ECW160: Wi-Fi 5 outdoor Cloud AP, IP67, 4×SMA, GbE PoE. Həyət və anbar üçün orijinal EnGenius Access Point, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius ECW160 (ECW160) Cloud idarə olunan outdoor Wi-Fi 5 Access Point-dir. 2×2 Wave 2 (400 + 867 Mbps), 4 × xarici RP-SMA anten, IP67 və 802.3af PoE həyət, anbar və kampus üçün nəzərdə tutulub. Mesh və EnGenius Cloud App ilə idarə olunur; işləmə −20…60 °C. Orijinal EnGenius Cloud outdoor modelidir; rəsmi 2 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  ECW130: {
    seoTitle: 'EnGenius ECW130 Wi-Fi 5 4×4 Cloud AP',
    seoDescription:
      'EnGenius ECW130: Wi-Fi 5 4×4 Cloud AP, 800+1800 Mbps, 2×GbE PoE+. Sıx ofis üçün orijinal EnGenius Access Point, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius ECW130 (ECW130) Cloud idarə olunan tavan Wi-Fi 5 Access Point-dir. 4×4:4 MU-MIMO (800 + 1 800 Mbps), 2 × GbE və 802.3at PoE+ sıx ofis və konfrans zalı üçün nəzərdə tutulub. EnGenius Cloud App və lokal Web GUI ilə idarə olunur. Orijinal EnGenius Cloud 4×4 modelidir; rəsmi 5 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  ECW220: {
    seoTitle: 'EnGenius ECW220 Wi-Fi 6 Cloud AP',
    seoDescription:
      'EnGenius ECW220: Wi-Fi 6 2×2 Cloud tavan AP, 574+1200 Mbps, GbE PoE. Ofis Wi-Fi üçün orijinal EnGenius Access Point, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius ECW220 (ECW220) Cloud idarə olunan tavan Wi-Fi 6 Access Point-dir. 2×2:2 MU-MIMO (574 + 1 200 Mbps), OFDMA, WPA3, 1 × GbE və 802.3af PoE ofis Wi-Fi üçün nəzərdə tutulub. Mesh və EnGenius Cloud App ilə idarə olunur. Orijinal EnGenius Cloud modelidir; rəsmi 5 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'EWS377-FIT': {
    seoTitle: 'EnGenius EWS377-FIT Wi-Fi 6 4×4 Fit AP',
    seoDescription:
      'EnGenius EWS377-FIT: Wi-Fi 6 4×4 Fit AP, 1148+2400 Mbps və 2.5GbE. Sıx zona üçün orijinal EnGenius Access Point, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius EWS377-FIT (EWS377-FIT) Fit indoor Wi-Fi 6 4×4 Access Point-dir. 1 148 + 2 400 Mbps, 2.5GbE LAN və 802.3at PoE+ sıx ofis və auditoriya üçün nəzərdə tutulub. FitXpress, FitController və standalone, WPA3 ilə idarə olunur. Orijinal EnGenius Fit 4×4 modelidir; rəsmi 1 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  ENH1350EXT: {
    seoTitle: 'EnGenius ENH1350EXT Wi-Fi 5 outdoor AP',
    seoDescription:
      'EnGenius ENH1350EXT: Wi-Fi 5 outdoor AP/CB/WDS, IP67, 4×SMA. Həyət körpüsü üçün orijinal EnGenius Access Point, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius ENH1350EXT (ENH1350EXT) outdoor dual-band Wi-Fi 5 Access Point / Client Bridge / WDS cihazıdır. 2×2 (400 + 867 Mbps), 4 × xarici SMA anten, IP67 və 802.3af PoE həyət körpüsü və anbar üçün nəzərdə tutulub. Standalone Web GUI, AP/CB/WDS rejimləri. Orijinal EnGenius EnJet/EnSky modelidir; rəsmi 1 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  ECW260: {
    seoTitle: 'EnGenius ECW260 Wi-Fi 6 outdoor AP',
    seoDescription:
      'EnGenius ECW260: Wi-Fi 6 outdoor Cloud AP, IP67, 2.5GbE, 4×SMA. Kampus həyəti üçün orijinal EnGenius Access Point, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius ECW260 (ECW260) Cloud idarə olunan outdoor Wi-Fi 6 Access Point-dir. 2×2:2 (574 + 1 200 Mbps), 2.5GbE, 4 × xarici SMA anten, IP67 və 802.3at PoE+ kampus həyəti üçün nəzərdə tutulub. WPA3, Beamforming və EnGenius Cloud ilə idarə olunur; −20…60 °C. Orijinal EnGenius Cloud outdoor modelidir; rəsmi 2 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  EWS377AP: {
    seoTitle: 'EnGenius EWS377AP Wi-Fi 6 4×4 Neutron AP',
    seoDescription:
      'EnGenius EWS377AP: Wi-Fi 6 4×4 Neutron AP, 1148+2400 Mbps, 2.5GbE. EWS idarəetmə ilə orijinal EnGenius Access Point, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius EWS377AP (EWS377AP) Neutron indoor Wi-Fi 6 4×4 Access Point-dir. 1 148 + 2 400 Mbps, 2.5GbE LAN və 802.3at PoE+ sıx ofis üçün nəzərdə tutulub. ezMaster, EWS wireless switch və lokal Web GUI ilə idarə olunur. Orijinal EnGenius Neutron 4×4 modelidir; rəsmi 1 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'EWS850-FIT': {
    seoTitle: 'EnGenius EWS850-FIT Wi-Fi 6 outdoor AP',
    seoDescription:
      'EnGenius EWS850-FIT: Wi-Fi 6 outdoor Fit AP, IP67, 2.5GbE və 4×SMA. Həyət və anbar üçün orijinal EnGenius Access Point, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius EWS850-FIT (EWS850-FIT) Fit outdoor Wi-Fi 6 Access Point-dir. 2×2:2 (574 + 1 200 Mbps), 2.5GbE, 4 × xarici RP-SMA, IP67 və 802.3at PoE+ həyət və anbar üçün nəzərdə tutulub. FitXpress, FitController və standalone, WPA3 ilə idarə olunur. Orijinal EnGenius Fit outdoor modelidir; rəsmi 1 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'EWS7928P-FIT': {
    seoTitle: 'EnGenius EWS7928P-FIT PoE+ Fit kommutator',
    seoDescription:
      'EnGenius EWS7928P-FIT: 24×GbE PoE+ 240 W, 4×SFP uplink, FitSwitch. AP və kamera üçün orijinal EnGenius kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius EWS7928P-FIT (EWS7928P-FIT) FitSwitch 24 PoE Layer 2+ kommutatordur. 24 × GbE PoE+ (240 W), 4 × 1G SFP və 56 Gbps switching Fit AP və IP kamera üçün nəzərdə tutulub. FitXpress, FitController və standalone Web GUI ilə idarə olunur; 19" 1U rackmount. Orijinal EnGenius Fit kommutatorudur; rəsmi 1 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  ECW230: {
    seoTitle: 'EnGenius ECW230 Wi-Fi 6 4×4 Cloud AP',
    seoDescription:
      'EnGenius ECW230: Wi-Fi 6 4×4 Cloud AP, 1148+2400 Mbps, 2.5GbE PoE+. Sıx ofis üçün orijinal EnGenius Access Point, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius ECW230 (ECW230) Cloud idarə olunan tavan Wi-Fi 6 4×4 Access Point-dir. 1 148 + 2 400 Mbps, 2.5GbE, 802.3at PoE+ və 8 inteqrasiya olunmuş anten sıx ofis üçün nəzərdə tutulub. OFDMA, MU-MIMO, WPA3, Mesh və EnGenius Cloud App ilə idarə olunur. Orijinal EnGenius Cloud 4×4 modelidir; rəsmi 5 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  ECW336: {
    seoTitle: 'EnGenius ECW336 Wi-Fi 6E Cloud AP',
    seoDescription:
      'EnGenius ECW336: Wi-Fi 6E 4×4 Cloud AP, 6 GHz 4800 Mbps, 5GbE PoE++. Yeni spektr üçün orijinal EnGenius Access Point, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius ECW336 (ECW336) Cloud idarə olunan tavan Wi-Fi 6E Access Point-dir. Tri-band 4×4 (1 148 / 2 400 / 4 800 Mbps), 5GbE LAN və 802.3bt PoE++ yüksək sıxlıqlı ofis üçün nəzərdə tutulub. WPA3, Mesh və Qualcomm Networking Pro 1210 EnGenius Cloud ilə idarə olunur. Orijinal EnGenius Cloud Wi-Fi 6E modelidir; rəsmi 5 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  ECW220S: {
    seoTitle: 'EnGenius ECW220S Wi-Fi 6 security AP',
    seoDescription:
      'EnGenius ECW220S: Wi-Fi 6 Cloud AP, scanning radio, BLE 5.0 və WIDS. Təhlükəsizlik üçün orijinal EnGenius Access Point, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius ECW220S (ECW220S) scanning radio-lu Cloud Wi-Fi 6 Access Point-dir. 2×2:2 (574 + 1 200 Mbps), ayrıca scanning radio, BLE 5.0, WIDS və WPA3 təhlükəsiz ofis Wi-Fi üçün nəzərdə tutulub. 802.3at PoE+ və EnGenius Cloud App ilə idarə olunur. Orijinal EnGenius Cloud security (S) modelidir; rəsmi 5 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'EWS7928FP-FIT': {
    seoTitle: 'EnGenius EWS7928FP-FIT PoE+ Fit kommutator',
    seoDescription:
      'EnGenius EWS7928FP-FIT: 24×GbE PoE+ 410 W, 4×SFP, FitSwitch Full PoE. AP parkı üçün orijinal EnGenius kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius EWS7928FP-FIT (EWS7928FP-FIT) FitSwitch 24 Full PoE Layer 2+ kommutatordur. 24 × GbE PoE+ (410 W), 4 × 1G SFP və 56 Gbps switching yüksək sıxlıqlı Fit AP üçün nəzərdə tutulub. FitXpress, FitController və standalone Web GUI; 19" 1U rackmount. Orijinal EnGenius Fit Full PoE kommutatorudur; rəsmi 1 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'EWS7952FP-FIT': {
    seoTitle: 'EnGenius EWS7952FP-FIT PoE+ Fit kommutator',
    seoDescription:
      'EnGenius EWS7952FP-FIT: 48×GbE PoE+ 740 W, 4×SFP, FitSwitch 48. Kampus AP parkı üçün orijinal EnGenius kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius EWS7952FP-FIT (EWS7952FP-FIT) FitSwitch 48 Full PoE Layer 2+ kommutatordur. 48 × GbE PoE+ (740 W), 4 × 1G SFP və 104 Gbps switching böyük Fit AP parkı üçün nəzərdə tutulub. FitXpress, FitController və standalone Web GUI; 19" 1U rackmount. Orijinal EnGenius Fit 48-port kommutatorudur; rəsmi 1 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  ESG510: {
    seoTitle: 'EnGenius ESG510 Cloud SD-WAN gateway',
    seoDescription:
      'EnGenius ESG510: 4×2.5GbE Cloud SD-WAN, PoE+ LAN və 4 Gbps firewall. Ofis şlüzü üçün orijinal EnGenius gateway, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius ESG510 (ESG510) Cloud idarə olunan SD-WAN / VPN security gateway-dir. 4 × 2.5GbE (dual WAN + dual LAN), 1 × PoE+ LAN, 4 Gbps SPI firewall və 970 Mbps VPN ofis şlüzü üçün nəzərdə tutulub. Dual-WAN load balancing, site-to-site VPN, USB 3.0 WWAN və TPM EnGenius Cloud ilə idarə olunur. Orijinal EnGenius Cloud gateway-dir; rəsmi 5 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  FITCON100: {
    seoTitle: 'EnGenius FitController idarəetmə platforması',
    seoDescription:
      'EnGenius FitController (FitCon100): lokal Fit idarəetmə, max 100 cihaz. Cloud abunəsiz orijinal EnGenius platforma, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'EnGenius FitController (FITCON100) Fit seriyası üçün lokal idarəetmə platformasıdır. Maksimum 100 Fit AP və kommutator, 2 × GbE (1 × PoE PD), ARM 1.8 GHz, 2 GB RAM və 8 GB flash cloud abunə olmadan idarəetmə üçündür. PoE in və ya DC 12 V; lokal Web GUI. Orijinal EnGenius Fit aksesuarıdır; rəsmi 1 il zəmanət və çatdırılma ilə təqdim olunur.',
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

function kindLabel(subcategorySlug: string): string {
  const bySlug: Record<string, string> = {
    router: 'gateway',
    'access-point': 'Access Point',
    kommutator: 'kommutator',
    'sfp-modullar': 'SFP modul',
    'sebeke-aksesuarlari': 'şəbəkə aksesuarı',
  };
  return bySlug[subcategorySlug] ?? 'şəbəkə avadanlığı';
}

function fallbackSeoCopy(input: EnGeniusSeoInput): EnGeniusSeoCopy {
  const sku = normalizeEnGeniusSku(input.sku);
  const kind = kindLabel(input.subcategorySlug);
  const ports = specValue(input.specs, (label) => label.startsWith('port'));
  const wifi = specValue(
    input.specs,
    (label) => label.startsWith('wi-fi') || label === 'standart',
  );

  const seoTitle = clampSeoText(
    `EnGenius ${sku} ${kind}`.replace(/\s+/g, ' ').trim(),
    SEO_TITLE_SOFT_MAX,
  );

  const parts = [
    `${input.title.trim()} (${sku}) — orijinal EnGenius ${kind}.`,
    ports ? `Portlar: ${ports}.` : null,
    wifi ? `Wi-Fi: ${wifi}.` : null,
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
  const sku = normalizeEnGeniusSku(input.sku);
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
