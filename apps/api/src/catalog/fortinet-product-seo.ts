/**
 * Hand-crafted Fortinet catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';
import { normalizeFortinetSku } from './fortinet-product-name';

export type FortinetSeoSpec = {
  label: string;
  value: string;
};

export type FortinetSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type FortinetSeoInput = {
  sku: string;
  title: string;
  specs: readonly FortinetSeoSpec[];
  subcategorySlug: string;
};

type FortinetSeoDraft = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

const HANDCRAFTED_FORTINET_SEO: Record<string, FortinetSeoDraft> = {
  'FS-108F': {
    seoTitle: 'Fortinet FortiSwitch 108F fanless kommutator',
    seoDescription:
      'Fortinet FS-108F: 8×GE fanless, 2×SFP uplink və PoE-PD qidalanma. Kiçik ofis üçün orijinal FortiSwitch kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Fortinet FortiSwitch 108F (FS-108F) Layer 2 Secure Access fanless desktop kommutatordur. 7 × GE RJ45, 1 × GE PoE-PD (cihazı qidalandırır), 2 × GE SFP uplink, 20 Gbps keçid tutumu və 8K MAC kiçik ofis üçün nəzərdə tutulub. FortiLink (FortiGate) və ya standalone FortiSwitchOS ilə idarə olunur. Orijinal Fortinet FortiSwitch modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FS-108F-FPOE': {
    seoTitle: 'Fortinet FortiSwitch 108F-FPOE kommutator',
    seoDescription:
      'Fortinet FS-108F-FPOE: 8×GE Full PoE+ 130 W, 2×SFP, fanless. AP və kamera üçün orijinal FortiSwitch kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Fortinet FortiSwitch 108F-FPOE (FS-108F-FPOE) Layer 2 Secure Access Full PoE+ kommutatordur. 8 × GE RJ45 PoE+ (130 W, 802.3af/at), 2 × GE SFP, 20 Gbps keçid tutumu və fanless soyutma kiçik ofis AP və IP kamera üçün nəzərdə tutulub. FortiLink və ya standalone FortiSwitchOS; desktop/19" bracket, daxili AC. Orijinal Fortinet FortiSwitch modelidir; rəsmi zəmanət və çatdırılma ilə.',
  },
  'FS-108F-POE': {
    seoTitle: 'Fortinet FortiSwitch 108F-POE kommutator',
    seoDescription:
      'Fortinet FS-108F-POE: 8×GE PoE+ 65 W, 2×SFP uplink, fanless. Kiçik ofis üçün orijinal FortiSwitch kommutator, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiSwitch 108F-POE (FS-108F-POE) Layer 2 Secure Access PoE+ kommutatordur. 8 × GE RJ45 PoE+ (65 W, 802.3af/at), 2 × GE SFP, 20 Gbps keçid tutumu və fanless soyutma kiçik ofis access point və VoIP üçün nəzərdə tutulub. FortiLink və ya standalone FortiSwitchOS; desktop/19" bracket. Orijinal Fortinet FortiSwitch modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FS-110G-FPOE': {
    seoTitle: 'Fortinet FortiSwitch 110G-FPOE kommutator',
    seoDescription:
      'Fortinet FS-110G-FPOE: Multi-Gig PoE-bt 200 W, 4×10G SFP+. Wi-Fi 6 AP üçün orijinal FortiSwitch kommutator, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiSwitch 110G-FPOE (FS-110G-FPOE) Layer 2 Multi-Gig PoE-bt Secure Access kommutatordur. 2 × 5G PoE-bt, 8 × 2.5G PoE af/at, 4 × 10G SFP+ uplink, 200 W PoE və 140 Gbps keçid tutumu Wi-Fi 6 access point üçün nəzərdə tutulub. Fanless desktop, xarici 54 V adapter. FortiLink və ya standalone FortiSwitchOS. Orijinal Fortinet FortiSwitch modelidir; rəsmi zəmanət və çatdırılma ilə.',
  },
  'FS-124F': {
    seoTitle: 'Fortinet FortiSwitch 124F 24-port kommutator',
    seoDescription:
      'Fortinet FS-124F: 24×GE, 4×10G SFP+ və fanless 1U. Ofis access üçün orijinal FortiSwitch kommutator, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiSwitch 124F (FS-124F) Layer 2 Secure Access kommutatordur. 24 × GE RJ45, 4 × 10G/1G SFP+ uplink, 128 Gbps keçid tutumu və 32K MAC ofis access üçün nəzərdə tutulub. PoE yoxdur; 1U rackmount, fanless, daxili AC. FortiLink və ya standalone FortiSwitchOS. Orijinal Fortinet FortiSwitch modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FS-124F-FPOE': {
    seoTitle: 'Fortinet FortiSwitch 124F-FPOE kommutator',
    seoDescription:
      'Fortinet FS-124F-FPOE: 24×GE Full PoE+ 370 W və 4×10G SFP+. AP parkı üçün orijinal FortiSwitch kommutator, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiSwitch 124F-FPOE (FS-124F-FPOE) Layer 2 Secure Access Full PoE+ kommutatordur. 24 × GE RJ45 PoE+ (370 W, 802.3af/at), 4 × 10G/1G SFP+, 128 Gbps keçid tutumu və 32K MAC yüksək sıxlıqlı AP və kamera üçün nəzərdə tutulub. 1U rackmount, smart fan. FortiLink və ya standalone FortiSwitchOS. Orijinal Fortinet FortiSwitch modelidir; rəsmi zəmanət və çatdırılma ilə.',
  },
  'FS-124F-POE': {
    seoTitle: 'Fortinet FortiSwitch 124F-POE kommutator',
    seoDescription:
      'Fortinet FS-124F-POE: 24×GE, PoE+ 185 W (port 1–12) və 4×10G SFP+. Ofis üçün orijinal FortiSwitch kommutator, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiSwitch 124F-POE (FS-124F-POE) Layer 2 Secure Access PoE+ kommutatordur. 24 × GE RJ45, PoE+ 185 W (port 1–12, 802.3af/at), 4 × 10G/1G SFP+ və 128 Gbps keçid tutumu qarışıq ofis access üçün nəzərdə tutulub. 1U rackmount, smart fan. FortiLink və ya standalone FortiSwitchOS. Orijinal Fortinet FortiSwitch modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FS-148F': {
    seoTitle: 'Fortinet FortiSwitch 148F 48-port kommutator',
    seoDescription:
      'Fortinet FS-148F: 48×GE, 4×10G SFP+ və 176 Gbps keçid. Yüksək sıxlıqlı ofis üçün orijinal FortiSwitch kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Fortinet FortiSwitch 148F (FS-148F) Layer 2 Secure Access kommutatordur. 48 × GE RJ45, 4 × 10G/1G SFP+ uplink, 176 Gbps keçid tutumu və 32K MAC yüksək sıxlıqlı ofis üçün nəzərdə tutulub. PoE yoxdur; 1U rackmount, daxili AC. FortiLink və ya standalone FortiSwitchOS. Orijinal Fortinet FortiSwitch modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FS-148F-FPOE': {
    seoTitle: 'Fortinet FortiSwitch 148F-FPOE kommutator',
    seoDescription:
      'Fortinet FS-148F-FPOE: 48×GE Full PoE+ 740 W və 4×10G SFP+. Kampus AP parkı üçün orijinal FortiSwitch kommutator, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Fortinet FortiSwitch 148F-FPOE (FS-148F-FPOE) Layer 2 Secure Access Full PoE+ kommutatordur. 48 × GE RJ45 PoE+ (740 W, 802.3af/at), 4 × 10G/1G SFP+, 176 Gbps keçid tutumu və 32K MAC kampus AP və IP kamera üçün nəzərdə tutulub. 1U rackmount, daxili AC. FortiLink və ya standalone FortiSwitchOS. Orijinal Fortinet FortiSwitch modelidir; rəsmi zəmanət və çatdırılma ilə.',
  },
  'FS-148F-POE': {
    seoTitle: 'Fortinet FortiSwitch 148F-POE kommutator',
    seoDescription:
      'Fortinet FS-148F-POE: 48×GE, PoE+ 370 W (port 1–24) və 4×10G SFP+. Ofis üçün orijinal FortiSwitch kommutator, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiSwitch 148F-POE (FS-148F-POE) Layer 2 Secure Access PoE+ kommutatordur. 48 × GE RJ45, PoE+ 370 W (port 1–24, 802.3af/at), 4 × 10G/1G SFP+ və 176 Gbps keçid tutumu qarışıq ofis access üçün nəzərdə tutulub. 1U rackmount, daxili AC. FortiLink və ya standalone FortiSwitchOS. Orijinal Fortinet FortiSwitch modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FS-224D-FPOE': {
    seoTitle: 'Fortinet FortiSwitch 224D-FPOE kommutator',
    seoDescription:
      'Fortinet FS-224D-FPOE: 24×GE Full PoE+ 370 W, L2/3 və 4×GE SFP. Ofis üçün orijinal FortiSwitch kommutator, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiSwitch 224D-FPOE (FS-224D-FPOE) Layer 2/3 Secure Access Full PoE+ kommutatordur. 24 × GE RJ45 PoE+ (370 W, 802.3af/at), 4 × GE SFP, 56 Gbps keçid tutumu və 16K MAC ofis AP və kamera üçün nəzərdə tutulub. 1U rackmount; opsional FRPS-740 redundant PSU. FortiLink və ya standalone FortiSwitchOS. Orijinal Fortinet FortiSwitch modelidir; rəsmi zəmanət və çatdırılma ilə.',
  },
  'FS-224E': {
    seoTitle: 'Fortinet FortiSwitch 224E L2/3 kommutator',
    seoDescription:
      'Fortinet FS-224E: 24×GE, 4×GE SFP, L2/3 və fanless 1U. Ofis access üçün orijinal FortiSwitch kommutator, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiSwitch 224E (FS-224E) Layer 2/3 Secure Access fanless kommutatordur. 24 × GE RJ45, 4 × GE SFP uplink, 56 Gbps keçid tutumu və 16K MAC ofis access üçün nəzərdə tutulub. PoE yoxdur; 1U rackmount, daxili AC. FortiLink və ya standalone FortiSwitchOS. Orijinal Fortinet FortiSwitch modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FS-224E-POE': {
    seoTitle: 'Fortinet FortiSwitch 224E-POE kommutator',
    seoDescription:
      'Fortinet FS-224E-POE: 24×GE, PoE+ 180 W (12 port), L2/3 və 4×SFP. Ofis üçün orijinal FortiSwitch kommutator, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiSwitch 224E-POE (FS-224E-POE) Layer 2/3 Secure Access PoE+ kommutatordur. 24 × GE RJ45, PoE+ 180 W (12 port, 802.3af/at), 4 × GE SFP və 56 Gbps keçid tutumu qarışıq ofis üçün nəzərdə tutulub. 1U rackmount; opsional FRPS-740. FortiLink və ya standalone FortiSwitchOS. Orijinal Fortinet FortiSwitch modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FS-248E-FPOE': {
    seoTitle: 'Fortinet FortiSwitch 248E-FPOE kommutator',
    seoDescription:
      'Fortinet FS-248E-FPOE: 48×GE Full PoE+ 740 W, L2/3 və 4×GE SFP. Kampus üçün orijinal FortiSwitch kommutator, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiSwitch 248E-FPOE (FS-248E-FPOE) Layer 2/3 Secure Access Full PoE+ kommutatordur. 48 × GE RJ45 PoE+ (740 W, 802.3af/at), 4 × GE SFP, 104 Gbps keçid tutumu və 16K MAC kampus AP parkı üçün nəzərdə tutulub. 1U rackmount; opsional FRPS-740. FortiLink və ya standalone FortiSwitchOS. Orijinal Fortinet FortiSwitch modelidir; rəsmi zəmanət və çatdırılma ilə.',
  },
  'FS-248E-POE': {
    seoTitle: 'Fortinet FortiSwitch 248E-POE kommutator',
    seoDescription:
      'Fortinet FS-248E-POE: 48×GE, PoE+ 370 W (24 port), L2/3 və 4×SFP. Ofis üçün orijinal FortiSwitch kommutator, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiSwitch 248E-POE (FS-248E-POE) Layer 2/3 Secure Access PoE+ kommutatordur. 48 × GE RJ45, PoE+ 370 W (24 port, 802.3af/at), 4 × GE SFP və 104 Gbps keçid tutumu qarışıq ofis üçün nəzərdə tutulub. 1U rackmount; opsional FRPS-740. FortiLink və ya standalone FortiSwitchOS. Orijinal Fortinet FortiSwitch modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FS-448E-POE': {
    seoTitle: 'Fortinet FortiSwitch 448E-POE kommutator',
    seoDescription:
      'Fortinet FS-448E-POE: 48×GE PoE+ 421 W, 4×10GE SFP+ campus L2/3. Kampus üçün orijinal FortiSwitch kommutator, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiSwitch 448E-POE (FS-448E-POE) Layer 2/3 Secure Campus PoE+ kommutatordur. 48 × GE RJ45 PoE+ (421 W, 802.3af/at), 4 × 10GE SFP+, 176 Gbps keçid tutumu və 32K MAC kampus access üçün nəzərdə tutulub. 1U rackmount, 1 GB DDR4, redundant AC dəstəyi. FortiLink və ya standalone FortiSwitchOS. Orijinal Fortinet FortiSwitch modelidir; rəsmi zəmanət və çatdırılma ilə.',
  },
  'FS-424E': {
    seoTitle: 'Fortinet FortiSwitch 424E campus kommutator',
    seoDescription:
      'Fortinet FS-424E: 24×GE, 4×10GE SFP+ campus L2/3. Kampus access üçün orijinal FortiSwitch kommutator, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiSwitch 424E (FS-424E) Layer 2/3 Secure Campus kommutatordur. 24 × GE RJ45, 4 × 10GE SFP+, 128 Gbps keçid tutumu və 16K MAC kampus access üçün nəzərdə tutulub. PoE yoxdur; 1U rackmount, daxili AC, redundant AC dəstəyi. FortiLink və ya standalone FortiSwitchOS. Orijinal Fortinet FortiSwitch modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FON-380': {
    seoTitle: 'Fortinet FortiFone 380 IP masa telefonu',
    seoDescription:
      'Fortinet FON-380: 3.5" rəngli ekran, 28 düymə, GbE PoE. Ofis masası üçün orijinal FortiFone IP telefon, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiFone 380 (FON-380) mid-range IP masa telefonudur. 3.5" rəngli ekran (480×320), 28 proqramlaşdırılan düymə, HD voice, 2 × GbE (LAN+PC) və 802.3af PoE ofis masası üçün nəzərdə tutulub. RJ9 və USB headset; FortiVoice auto-provision, SIP/TLS/SRTP. Orijinal Fortinet FortiFone modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FON-480': {
    seoTitle: 'Fortinet FortiFone 480 IP masa telefonu',
    seoDescription:
      'Fortinet FON-480: 4.3" rəngli ekran, 45 düymə, Bluetooth və PoE. Ofis üçün orijinal FortiFone IP telefon, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiFone 480 (FON-480) high-end IP masa telefonudur. 4.3" rəngli ekran (480×272), 45 proqramlaşdırılan düymə, premium HD audio, daxili Bluetooth, 2 × GbE və 802.3af PoE ofis masası üçün nəzərdə tutulub. RJ9 / USB / Bluetooth headset; SIP/TLS/SRTP. Orijinal Fortinet FortiFone modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FON-580': {
    seoTitle: 'Fortinet FortiFone 580 IP masa telefonu',
    seoDescription:
      'Fortinet FON-580: triple-screen, 106 düymə, GbE PoE. Resepsiya üçün orijinal FortiFone IP telefon, rəsmi zəmanət və çatdırılma ilə Azərbaycanda satılır.',
    pageIntro:
      'Fortinet FortiFone 580 (FON-580) receptionist/call-attendant IP telefonudur. 4.3" əsas + 2 × 3.5" yan ekran, 106 proqramlaşdırılan düymə, HD voice, daxili Bluetooth, 2 × GbE və 802.3af PoE resepsiya üçün nəzərdə tutulub. FortiVoice ilə işləyir. Orijinal Fortinet FortiFone modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FON-C71': {
    seoTitle: 'Fortinet FortiFone C71 IP konfrans telefonu',
    seoDescription:
      'Fortinet FON-C71: HD IP konfrans, 360° mikrofon, Wi-Fi və Bluetooth. Otaq üçün orijinal FortiFone, rəsmi zəmanət və çatdırılma ilə Azərbaycanda satılır.',
    pageIntro:
      'Fortinet FortiFone C71 (FON-C71) kiçik və orta otaq üçün HD IP konfrans telefonudur. 3-mikrofon massivi (360°, ~6 m), full-duplex AEC, sensorlu idarəetmə, daxili Wi-Fi və Bluetooth FortiVoice ilə işləyir. Zəng yazılması dəstəklənir. Orijinal Fortinet FortiFone konfrans modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FG-30G': {
    seoTitle: 'Fortinet FortiGate 30G desktop NGFW',
    seoDescription:
      'Fortinet FG-30G: desktop NGFW, 4×GE, IPS 800 Mbps və SD-WAN. Kiçik ofis üçün orijinal FortiGate firewall, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiGate 30G (FG-30G) desktop NGFW + SD-WAN cihazıdır. 4 × GE RJ45 (WAN/LAN/FortiLink), firewall 4 Gbps, IPS 800 Mbps, NGFW 570 Mbps və Threat Protection 500 Mbps kiçik ofis üçün nəzərdə tutulub. SoC4 ASIC, TPM, fanless; FortiOS, FortiLink (FortiSwitch/FortiAP). Orijinal Fortinet FortiGate modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FWF-30G-E': {
    seoTitle: 'Fortinet FortiWiFi 30G desktop NGFW',
    seoDescription:
      'Fortinet FWF-30G-E: desktop NGFW, Wi-Fi 6 AP, 4×GE və IPS 800 Mbps. Kiçik ofis üçün orijinal FortiWiFi, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiWiFi 30G (FWF-30G-E) desktop NGFW + inteqrasiya olunmuş Wi-Fi 6 AP-dir. 4 × GE RJ45, dual-radio 802.11ax, firewall 4 Gbps, IPS 800 Mbps və Threat Protection 500 Mbps kiçik ofis üçün nəzərdə tutulub. SoC4 ASIC, TPM, fanless; 3 xarici anten, region E. Orijinal Fortinet FortiWiFi modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FG-40F': {
    seoTitle: 'Fortinet FortiGate 40F desktop NGFW',
    seoDescription:
      'Fortinet FG-40F: desktop NGFW, 5×GE, IPS 1 Gbps və SD-WAN. Kiçik ofis üçün orijinal FortiGate firewall, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiGate 40F (FG-40F) desktop NGFW + SD-WAN cihazıdır. 5 × GE RJ45 (LAN/FortiLink/WAN), firewall 5 Gbps, IPS 1 Gbps, NGFW 800 Mbps və Threat Protection 600 Mbps kiçik ofis üçün nəzərdə tutulub. SoC4 ASIC; FortiOS və FortiLink. Orijinal Fortinet FortiGate modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FG-40F-3G4G': {
    seoTitle: 'Fortinet FortiGate 40F-3G4G LTE NGFW',
    seoDescription:
      'Fortinet FG-40F-3G4G: desktop NGFW, daxili CAT-12 LTE və dual SIM. Filial üçün orijinal FortiGate firewall, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiGate 40F-3G4G (FG-40F-3G4G) desktop NGFW + daxili CAT-12 LTE cihazıdır. 5 × GE RJ45, dual Nano SIM, firewall 5 Gbps, IPS 1 Gbps və Threat Protection 600 Mbps filial və LTE backup üçün nəzərdə tutulub. SoC4 ASIC; WWAN antenlər daxildir. Wi-Fi yoxdur. Orijinal Fortinet FortiGate modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FG-50G': {
    seoTitle: 'Fortinet FortiGate 50G desktop NGFW',
    seoDescription:
      'Fortinet FG-50G: desktop NGFW, SP5 ASIC, IPS 2.25 Gbps və SD-WAN. SMB üçün orijinal FortiGate firewall, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiGate 50G (FG-50G) desktop NGFW + SD-WAN cihazıdır. 5 × GE RJ45, firewall 5 Gbps, IPS 2.25 Gbps, NGFW 1.25 Gbps və Threat Protection 1.1 Gbps kiçik/orta ofis üçün nəzərdə tutulub. SP5 ASIC, TPM, BLE, fanless; FortiOS və FortiLink. Orijinal Fortinet FortiGate modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FG-50G-SFP': {
    seoTitle: 'Fortinet FortiGate 50G-SFP desktop NGFW',
    seoDescription:
      'Fortinet FG-50G-SFP: desktop NGFW, GE SFP uplink, IPS 2.25 Gbps. Fiber WAN üçün orijinal FortiGate firewall, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiGate 50G-SFP (FG-50G-SFP) desktop NGFW + SD-WAN cihazıdır. 5 × GE RJ45 + 1 × GE SFP, firewall 5 Gbps, IPS 2.25 Gbps və Threat Protection 1.1 Gbps fiber WAN üçün nəzərdə tutulub. SP5 ASIC, TPM, BLE; FortiOS və FortiLink. Orijinal Fortinet FortiGate modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FG-51G': {
    seoTitle: 'Fortinet FortiGate 51G desktop NGFW',
    seoDescription:
      'Fortinet FG-51G: desktop NGFW, 64 GB SSD, IPS 2.25 Gbps və SD-WAN. SMB üçün orijinal FortiGate firewall, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiGate 51G (FG-51G) desktop NGFW + SD-WAN cihazıdır. 5 × GE RJ45, 64 GB SSD, firewall 5 Gbps, IPS 2.25 Gbps və Threat Protection 1.1 Gbps log və disk saxlama üçün nəzərdə tutulub. SP5 ASIC, TPM, BLE, fanless; FortiOS və FortiLink. Orijinal Fortinet FortiGate modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FG-51G-SFP-POE': {
    seoTitle: 'Fortinet FortiGate 51G-SFP-PoE NGFW',
    seoDescription:
      'Fortinet FG-51G-SFP-PoE: desktop NGFW, PoE+ LAN/WAN, SFP və 64 GB SSD. SMB üçün orijinal FortiGate, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiGate 51G-SFP-PoE (FG-51G-SFP-POE) desktop NGFW + PoE+ + SFP cihazıdır. PoE+ LAN/WAN portlar, 1 × SFP, 64 GB SSD, IPS 2.25 Gbps və Threat Protection 1.1 Gbps FortiAP/FortiSwitch qidalandırmaq üçün nəzərdə tutulub. SP5 ASIC, TPM; 54 V adapter. Orijinal Fortinet FortiGate modelidir; rəsmi zəmanət və çatdırılma ilə.',
  },
  'FG-60F': {
    seoTitle: 'Fortinet FortiGate 60F desktop NGFW',
    seoDescription:
      'Fortinet FG-60F: desktop NGFW, 10×GE, IPS 1.4 Gbps və dual WAN. SMB üçün orijinal FortiGate firewall, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiGate 60F (FG-60F) desktop NGFW + SD-WAN cihazıdır. 10 × GE RJ45 (LAN, FortiLink, DMZ, dual WAN), firewall 10 Gbps, IPS 1.4 Gbps, NGFW 1 Gbps və Threat Protection 700 Mbps orta ofis üçün nəzərdə tutulub. SoC4 ASIC; FortiOS və FortiLink. Orijinal Fortinet FortiGate modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FG-61F': {
    seoTitle: 'Fortinet FortiGate 61F desktop NGFW',
    seoDescription:
      'Fortinet FG-61F: desktop NGFW, 128 GB SSD, 10×GE və IPS 1.4 Gbps. SMB üçün orijinal FortiGate firewall, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiGate 61F (FG-61F) desktop NGFW + SD-WAN cihazıdır. 10 × GE RJ45, 128 GB SSD, firewall 10 Gbps, IPS 1.4 Gbps və Threat Protection 700 Mbps log saxlama üçün nəzərdə tutulub. SoC4 ASIC; FortiOS və FortiLink. Orijinal Fortinet FortiGate modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FG-70G': {
    seoTitle: 'Fortinet FortiGate 70G desktop NGFW',
    seoDescription:
      'Fortinet FG-70G: desktop NGFW, 10×GE, IPS 2.5 Gbps və SP5 ASIC. SMB üçün orijinal FortiGate firewall, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiGate 70G (FG-70G) desktop NGFW + SD-WAN cihazıdır. 10 × GE RJ45 (LAN, FortiLink, dual WAN), firewall 10 Gbps, IPS 2.5 Gbps, NGFW 1.5 Gbps və Threat Protection 1.3 Gbps orta ofis üçün nəzərdə tutulub. SP5 ASIC, TPM, BLE, fanless; FortiOS və FortiLink. Orijinal Fortinet FortiGate modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FG-71G': {
    seoTitle: 'Fortinet FortiGate 71G desktop NGFW',
    seoDescription:
      'Fortinet FG-71G: desktop NGFW, 64 GB SSD, 10×GE və IPS 2.5 Gbps. SMB üçün orijinal FortiGate firewall, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiGate 71G (FG-71G) desktop NGFW + SD-WAN cihazıdır. 10 × GE RJ45, 64 GB SSD, firewall 10 Gbps, IPS 2.5 Gbps və Threat Protection 1.3 Gbps log saxlama üçün nəzərdə tutulub. SP5 ASIC, TPM, BLE, fanless; FortiOS və FortiLink. Orijinal Fortinet FortiGate modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FG-80F': {
    seoTitle: 'Fortinet FortiGate 80F desktop NGFW',
    seoDescription:
      'Fortinet FG-80F: desktop NGFW, shared WAN SFP, IPS 1.4 Gbps və TPM. Ofis üçün orijinal FortiGate firewall, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiGate 80F (FG-80F) desktop NGFW + SD-WAN cihazıdır. 8 × GE RJ45 + 2 × RJ45/SFP shared WAN, firewall 10 Gbps, IPS 1.4 Gbps və Threat Protection 900 Mbps fiber WAN üçün nəzərdə tutulub. SoC4 ASIC, TPM, BLE; FortiOS və FortiLink. Orijinal Fortinet FortiGate modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FG-81F': {
    seoTitle: 'Fortinet FortiGate 81F desktop NGFW',
    seoDescription:
      'Fortinet FG-81F: desktop NGFW, 128 GB SSD, shared WAN SFP və IPS 1.4 Gbps. Ofis üçün orijinal FortiGate, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiGate 81F (FG-81F) desktop NGFW + SD-WAN cihazıdır. 8 × GE RJ45 + 2 × RJ45/SFP shared WAN, 128 GB SSD, firewall 10 Gbps və Threat Protection 900 Mbps log saxlama üçün nəzərdə tutulub. SoC4 ASIC, TPM, BLE; FortiOS və FortiLink. Orijinal Fortinet FortiGate modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FG-90G': {
    seoTitle: 'Fortinet FortiGate 90G desktop NGFW',
    seoDescription:
      'Fortinet FG-90G: desktop NGFW, 10GE WAN, IPS 4.5 Gbps və SP5 ASIC. Yüksək sürət üçün orijinal FortiGate, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiGate 90G (FG-90G) desktop NGFW + SD-WAN cihazıdır. 8 × GE RJ45 + 2 × 10GE RJ45/SFP+ shared WAN, firewall 28 Gbps, IPS 4.5 Gbps, NGFW 2.5 Gbps və Threat Protection 2.2 Gbps yüksək sürətli ofis üçün nəzərdə tutulub. SP5 ASIC, TPM, BLE; FortiOS və FortiLink. Orijinal Fortinet FortiGate modelidir; rəsmi zəmanət və çatdırılma ilə.',
  },
  'FG-91G': {
    seoTitle: 'Fortinet FortiGate 91G desktop NGFW',
    seoDescription:
      'Fortinet FG-91G: desktop NGFW, 120 GB SSD, 10GE WAN və IPS 4.5 Gbps. Ofis üçün orijinal FortiGate firewall, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiGate 91G (FG-91G) desktop NGFW + SD-WAN cihazıdır. 8 × GE RJ45 + 2 × 10GE RJ45/SFP+ shared WAN, 120 GB SSD, firewall 28 Gbps və Threat Protection 2.2 Gbps log saxlama üçün nəzərdə tutulub. SP5 ASIC, TPM, BLE; FortiOS və FortiLink. Orijinal Fortinet FortiGate modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FG-100F': {
    seoTitle: 'Fortinet FortiGate 100F 1U NGFW',
    seoDescription:
      'Fortinet FG-100F: 1U NGFW, 22×GE, 2×10G FortiLink, dual AC. Kampus kənarı üçün orijinal FortiGate, rəsmi zəmanət və çatdırılma ilə Azərbaycanda satılır.',
    pageIntro:
      'Fortinet FortiGate 100F (FG-100F) 1U NGFW + SD-WAN cihazıdır. 22 × GE RJ45, 4 × GE SFP, 2 × 10G SFP+ FortiLink, firewall 20 Gbps, IPS 2.6 Gbps və Threat Protection 1 Gbps kampus kənarı üçün nəzərdə tutulub. SoC4 ASIC, dual AC (non-hot-swap). Orijinal Fortinet FortiGate modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FG-100F-LENC': {
    seoTitle: 'Fortinet FortiGate 100F-LENC 1U NGFW',
    seoDescription:
      'Fortinet FG-100F-LENC: 1U NGFW, 22×GE, 2×10G FortiLink, dual AC. Export LENC SKU üçün orijinal FortiGate, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiGate 100F-LENC (FG-100F-LENC) 1U NGFW + SD-WAN Low Encryption SKU-dur. 22 × GE RJ45, 4 × GE SFP, 2 × 10G SFP+ FortiLink, firewall 20 Gbps, IPS 2.6 Gbps və Threat Protection 1 Gbps kampus kənarı üçün nəzərdə tutulub. Hardware FG-100F ilə eynidir; LENC yalnız 56-bit DES. SoC4 ASIC, dual AC. Orijinal Fortinet FortiGate modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FG-101F': {
    seoTitle: 'Fortinet FortiGate 101F 1U NGFW',
    seoDescription:
      'Fortinet FG-101F: 1U NGFW, 480 GB SSD, 2×10G FortiLink və dual AC. Kampus üçün orijinal FortiGate, rəsmi zəmanət və çatdırılma ilə Azərbaycanda satılır.',
    pageIntro:
      'Fortinet FortiGate 101F (FG-101F) 1U NGFW + SD-WAN cihazıdır. 100F ilə eyni portlar, 480 GB SSD, firewall 20 Gbps, IPS 2.6 Gbps və Threat Protection 1 Gbps log saxlama üçün nəzərdə tutulub. SoC4 ASIC, dual AC. Orijinal Fortinet FortiGate modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FG-120G': {
    seoTitle: 'Fortinet FortiGate 120G 1U NGFW',
    seoDescription:
      'Fortinet FG-120G: 1U NGFW, 4×10GE SFP+, IPS 5.3 Gbps və SP5 ASIC. Kampus üçün orijinal FortiGate, rəsmi zəmanət və çatdırılma ilə Azərbaycanda satılır.',
    pageIntro:
      'Fortinet FortiGate 120G (FG-120G) 1U NGFW + SD-WAN cihazıdır. 16 × GE RJ45, 8 × GE SFP, 4 × 10GE SFP+, firewall 39 Gbps, IPS 5.3 Gbps və Threat Protection 2.8 Gbps kampus kənarı üçün nəzərdə tutulub. SP5 ASIC, TPM, dual AC. Orijinal Fortinet FortiGate modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FG-121G': {
    seoTitle: 'Fortinet FortiGate 121G 1U NGFW',
    seoDescription:
      'Fortinet FG-121G: 1U NGFW, 480 GB SSD, 4×10GE SFP+ və IPS 5.3 Gbps. Kampus üçün orijinal FortiGate, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiGate 121G (FG-121G) 1U NGFW + SD-WAN cihazıdır. 120G ilə eyni portlar, 480 GB SSD, firewall 39 Gbps, IPS 5.3 Gbps və Threat Protection 2.8 Gbps log saxlama üçün nəzərdə tutulub. SP5 ASIC, TPM, dual AC. Orijinal Fortinet FortiGate modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FG-121G-LENC': {
    seoTitle: 'Fortinet FortiGate 121G-LENC 1U NGFW',
    seoDescription:
      'Fortinet FG-121G-LENC: 1U NGFW, 480 GB SSD, 4×10GE SFP+ və IPS 5.3 Gbps. LENC SKU üçün orijinal FortiGate, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiGate 121G-LENC (FG-121G-LENC) 1U NGFW + SD-WAN Low Encryption SKU-dur. 120G ilə eyni portlar, 480 GB SSD, firewall 39 Gbps, IPS 5.3 Gbps və Threat Protection 2.8 Gbps. Hardware FG-121G ilə eynidir; LENC yalnız 56-bit DES. SP5 ASIC, TPM, dual AC. Orijinal Fortinet FortiGate modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FVE-100E': {
    seoTitle: 'Fortinet FortiVoice 100E IP PBX',
    seoDescription:
      'Fortinet FVE-100E: IP PBX, 100 daxili nömrə, 4×GE və 500 GB HDD. Ofis telefoniyası üçün orijinal FortiVoice, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiVoice 100E (FVE-100E) legacy IP PBX appliance-dır. 4 × GE RJ45, 500 GB HDD, 100 daxili nömrə və 15 VoIP trunk ofis telefoniyası üçün nəzərdə tutulub. FortiVoice Enterprise — SIP/PRI/FXO, auto-attendant, voicemail və recording. Orijinal Fortinet FortiVoice hardware-idir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FVE-20E4': {
    seoTitle: 'Fortinet FortiVoice 20E4 IP PBX',
    seoDescription:
      'Fortinet FVE-20E4: kiçik ofis IP PBX, 20 endpoint və 4×FXO. Filial telefoniyası üçün orijinal FortiVoice, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiVoice 20E4 (FVE-20E4) kiçik ofis IP PBX-dir. 2 × 10/100 RJ45, 4 × FXO, 20 endpoint, 4 VoIP trunk və 10 eyni anda zəng filial üçün nəzərdə tutulub. Desktop, xarici PSU; local survivable. Orijinal Fortinet FortiVoice modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FVE-50E6': {
    seoTitle: 'Fortinet FortiVoice 50E6 IP PBX',
    seoDescription:
      'Fortinet FVE-50E6: SMB IP PBX, 50 endpoint, 6×FXO və 2×FXS. Ofis telefoniyası üçün orijinal FortiVoice, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiVoice 50E6 (FVE-50E6) SMB IP PBX-dir. 2 × 10/100 RJ45, 6 × FXO, 2 × FXS, 50 endpoint və 8 VoIP trunk orta ofis telefoniyası üçün nəzərdə tutulub. Desktop, xarici PSU; local survivable. Orijinal Fortinet FortiVoice modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FAP-231F-E': {
    seoTitle: 'Fortinet FortiAP 231F Wi-Fi 6 AP',
    seoDescription:
      'Fortinet FAP-231F-E: indoor Wi-Fi 6, tri-radio, 2×GbE PoE. Ofis Wi-Fi üçün orijinal FortiAP Access Point, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiAP 231F (FAP-231F-E) indoor Wi-Fi 6 Access Point-dir. Tri-radio 2×2 (574 + 1201 Mbps) + scanning, 2 × GE RJ45 PoE diversity, BLE/ZigBee və 802.3at PoE ofis Wi-Fi üçün nəzərdə tutulub. Daxili anten, tavan/divar dəsti daxildir; region E. FortiGate ilə idarə olunur. Orijinal Fortinet FortiAP modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FAP-231G-E': {
    seoTitle: 'Fortinet FortiAP 231G Wi-Fi 6E AP',
    seoDescription:
      'Fortinet FAP-231G-E: indoor Wi-Fi 6E, 2.5GbE, BLE/ZigBee və PoE. Ofis Wi-Fi üçün orijinal FortiAP Access Point, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Fortinet FortiAP 231G (FAP-231G-E) indoor Wi-Fi 6E Access Point-dir. Tri-band 2×2 (574 + 1201 + 2402 Mbps), 1 × 2.5GbE + 1 × GE, BLE/ZigBee və 802.3at PoE ofis Wi-Fi üçün nəzərdə tutulub. Daxili anten, region E. FortiGate/FortiLAN Cloud ilə idarə olunur. Orijinal Fortinet FortiAP modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FAP-231K-E': {
    seoTitle: 'Fortinet FortiAP 231K Wi-Fi 7 AP',
    seoDescription:
      'Fortinet FAP-231K-E: indoor Wi-Fi 7, tri-band 2.4/5/6 GHz və 5GbE. Ofis üçün orijinal FortiAP Access Point, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiAP 231K (FAP-231K-E) indoor Wi-Fi 7 Access Point-dir. Tri-band 2×2 (688 Mbps + 2.882 + 5.765 Gbps), 1 × 5GbE, BLE/ZigBee, GPS və 802.3at PoE ofis Wi-Fi üçün nəzərdə tutulub. Daxili anten, tavan/divar dəsti daxildir; region E. FortiGate/FortiLAN Cloud ilə idarə olunur. Orijinal Fortinet FortiAP modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FAP-221E-E': {
    seoTitle: 'Fortinet FortiAP 221E Wi-Fi 5 AP',
    seoDescription:
      'Fortinet FAP-221E-E: indoor Wi-Fi 5 Wave 2, 2×2 MU-MIMO və GbE PoE. Ofis Wi-Fi üçün orijinal FortiAP Access Point, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Fortinet FortiAP 221E (FAP-221E-E) indoor Wi-Fi 5 Wave 2 Access Point-dir. 2×2 MU-MIMO (400 + 867 Mbps), 1 × GE RJ45, BLE və 802.3af PoE ofis Wi-Fi üçün nəzərdə tutulub. Daxili anten, tavan/divar dəsti daxildir; region E. FortiGate ilə idarə olunur. Orijinal Fortinet FortiAP modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FN-TRAN-LX': {
    seoTitle: 'Fortinet FN-TRAN-LX 1G SFP LX modul',
    seoDescription:
      'Fortinet FN-TRAN-LX: 1G 1000BASE-LX, 1310 nm SMF 10 km LC. FortiGate/FortiSwitch üçün orijinal SFP modul, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FN-TRAN-LX (FN-TRAN-LX) 1GE SFP LX transceivərdir. 1000BASE-LX, LC, SMF 1310 nm və 10 km məsafə Fortinet SFP yuvası üçün nəzərdə tutulub. İşləmə −40…85 °C; SFP və SFP/SFP+ slotlu Fortinet sistemləri. Orijinal Fortinet moduludur; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FN-TRAN-SX': {
    seoTitle: 'Fortinet FN-TRAN-SX 1G SFP SX modul',
    seoDescription:
      'Fortinet FN-TRAN-SX: 1G 1000BASE-SX, 850 nm MMF LC. Qısa fiber üçün orijinal Fortinet SFP modul, rəsmi zəmanət və çatdırılma ilə Azərbaycanda satılır.',
    pageIntro:
      'Fortinet FN-TRAN-SX (FN-TRAN-SX) 1GE SFP SX transceivərdir. 1000BASE-SX, LC, MMF 850 nm, 220 m (62.5/125 µm) / 500 m (50/125 µm) Fortinet SFP yuvası üçün nəzərdə tutulub. İşləmə −20…85 °C. Orijinal Fortinet moduludur; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FN-TRAN-SFP-LR': {
    seoTitle: 'Fortinet FN-TRAN-SFP+LR 10G SFP+ modul',
    seoDescription:
      'Fortinet FN-TRAN-SFP+LR: 10GBASE-LR, 1310 nm SMF 10 km LC. Fortinet uplink üçün orijinal SFP+ modul, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FN-TRAN-SFP+LR (FN-TRAN-SFP-LR) 10GE SFP+ LR transceivərdir. 10GBASE-LR, LC, SMF 1310 nm və 10 km məsafə Fortinet SFP+/SFP28 yuvası üçün nəzərdə tutulub. İşləmə 0…70 °C. Orijinal Fortinet 10G moduludur; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FN-TRAN-SFP-SR': {
    seoTitle: 'Fortinet FN-TRAN-SFP+SR 10G SFP+ modul',
    seoDescription:
      'Fortinet FN-TRAN-SFP+SR: 10GBASE-SR, 850 nm MMF, 300 m OM3. Qısa 10G üçün orijinal Fortinet SFP+ modul, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FN-TRAN-SFP+SR (FN-TRAN-SFP-SR) 10GE SFP+ SR transceivərdir. 10GBASE-SR, LC, MMF 850 nm, 300 m OM3 / 550 m OM4 Fortinet SFP+ yuvası üçün nəzərdə tutulub. İşləmə −40…85 °C. Orijinal Fortinet 10G moduludur; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FEX-200F': {
    seoTitle: 'Fortinet FortiExtender 200F LAN extender',
    seoDescription:
      'Fortinet FEX-200F: FortiGate LAN extension, 5×GbE L2 tunnel. Uzaq ofis üçün orijinal FortiExtender, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FortiExtender 200F (FEX-200F) FortiGate LAN extension (L2 tunnel) cihazıdır. 5 × GbE RJ45 (hər biri WAN və ya LAN), USB 2.0 və Bluetooth uzaq ofis/filial üçün nəzərdə tutulub. 5G/LTE modem yoxdur; 12 V adapter, divar/desktop. Orijinal Fortinet FortiExtender modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'SP-CONSOLE-USB-10': {
    seoTitle: 'Fortinet USB–RJ45 konsol kabeli 10-pack',
    seoDescription:
      'Fortinet SP-CONSOLE-USB-10: USB–RJ45 konsol kabeli, 10 ədəd paket. FortiGate və FortiSwitch üçün orijinal aksesuar, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Fortinet SP-CONSOLE-USB-10 (SP-CONSOLE-USB-10) USB–RJ45 konsol kabeli 10-pack-dir. FortiGate və FortiSwitch RJ45 konsol portu üçün nəzərdə tutulub. Orijinal Fortinet şəbəkə aksesuarıdır; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'SP-FG300E-PS': {
    seoTitle: 'Fortinet FortiGate E-series AC PSU',
    seoDescription:
      'Fortinet SP-FG300E-PS: AC ehtiyat qida bloku, FG-300E–1100E seriyası. Rack FortiGate üçün orijinal PSU, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet SP-FG300E-PS (SP-FG300E-PS) AC ehtiyat qida blokudur. FG-300/301E, 400/401E, 500/501E, 600/601E, 1100/1101E, FAZ-200F/300F/800F və FMG-200F/300F üçün nəzərdə tutulub. Power cable ayrı satılır. Orijinal Fortinet PSU-dur; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'SP-FG60CPCOR-EU': {
    seoTitle: 'Fortinet EU C6 qida kabeli',
    seoDescription:
      'Fortinet SP-FG60CPCOR-EU: EU C6 qida kabeli, 6 ft (~1.8 m). Desktop FortiGate adapter üçün orijinal kabel, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet SP-FG60CPCOR-EU (SP-FG60CPCOR-EU) EU C6 qida kabelidir. CEE 7/7 (EU) → IEC 60320 C6, 6 ft (~1.8 m), 220 V AC desktop FortiGate AC adapter üçün nəzərdə tutulub. FG/FWF 40/60/80/90 seriyası C6 giriş. Adapter ayrı SKU-dur. Orijinal Fortinet şəbəkə aksesuarıdır; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'SP-FG60E-PDC-1': {
    seoTitle: 'Fortinet FortiGate AC adapter 1 ədəd',
    seoDescription:
      'Fortinet SP-FG60E-PDC-1: desktop FortiGate AC adapter, 1 ədəd. 60/80 seriyası üçün orijinal aksesuar, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet SP-FG60E-PDC-1 (SP-FG60E-PDC-1) desktop FortiGate AC adapteridir (1 ədəd). FG/FWF 60E/61E, 60F/61F, 80E/81E, 80F/81F üçün nəzərdə tutulub. C6 AC giriş; qida kabeli ayrı satılır. Multi-pack variant PDC-2/PDC-5-dir. Orijinal Fortinet aksesuarıdır; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'SP-FG60E-PDC-2': {
    seoTitle: 'Fortinet FortiGate desktop AC adapter',
    seoDescription:
      'Fortinet SP-FG60E-PDC-2: desktop FortiGate AC adapter paketi. 60/70/80/90 seriyası üçün orijinal aksesuar, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet SP-FG60E-PDC-2 (SP-FG60E-PDC-2) desktop FortiGate AC adapter paketidir. FG/FWF 60E/61E, 60F/61F, 70/71F, 70G/71G, 80E/81E, 80/81F, 90/91G və FDC-100G üçün nəzərdə tutulub. Kabel ayrı satılır. Orijinal Fortinet aksesuarıdır; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'SP-RACKTRAY-02': {
    seoTitle: 'Fortinet FortiGate desktop rack tray',
    seoDescription:
      'Fortinet SP-RACKTRAY-02: desktop FortiGate üçün rack montaj tray. E/F/G series üçün orijinal Fortinet aksesuar, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Fortinet SP-RACKTRAY-02 (SP-RACKTRAY-02) desktop FortiGate modelləri üçün rack montaj tray-dir. FortiGate E/F/G series desktop; SP-RackTray-01 ilə geriyə uyğundur. Orijinal Fortinet şəbəkə aksesuarıdır; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FN-CABLE-SFP-1': {
    seoTitle: 'Fortinet 10G SFP+ DAC kabel 1 m',
    seoDescription:
      'Fortinet FN-CABLE-SFP+1: 10GE SFP+ passive DAC, 1 m. FortiGate/FortiSwitch uplink üçün orijinal kabel, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Fortinet FN-CABLE-SFP+1 (FN-CABLE-SFP-1) 10GE SFP+ passive DAC kabeldir. 1 m uzunluq, transceiver-lər kabelə daxildir; Fortinet SFP/SFP+ slotlar üçün nəzərdə tutulub. İşləmə 0…70 °C. Orijinal Fortinet DAC-dir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'FN-CABLE-SFP-3': {
    seoTitle: 'Fortinet 10G SFP+ DAC kabel 3 m',
    seoDescription:
      'Fortinet FN-CABLE-SFP+3: 10GE SFP+ passive DAC, 3 m. Rack içi uplink üçün orijinal Fortinet kabel, rəsmi zəmanət və çatdırılma ilə Azərbaycanda satılır.',
    pageIntro:
      'Fortinet FN-CABLE-SFP+3 (FN-CABLE-SFP-3) 10GE SFP+ passive DAC kabeldir. 3 m uzunluq, transceiver-lər kabelə daxildir; Fortinet SFP/SFP+ slotlar üçün nəzərdə tutulub. İşləmə 0…70 °C. Orijinal Fortinet DAC-dir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
};

function specValue(
  specs: readonly FortinetSeoSpec[],
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
    kommutator: 'kommutator',
    firewall: 'firewall',
    'access-point': 'Access Point',
    router: 'LAN extender',
    'ip-telefon': 'IP telefon',
    'ip-konfrans-telefonu': 'IP Konfrans telefonu',
    'ip-pbx': 'IP PBX',
    'sfp-modullar': 'SFP modul',
    'sebeke-aksesuarlari': 'şəbəkə aksesuarı',
  };
  return bySlug[subcategorySlug] ?? 'şəbəkə avadanlığı';
}

function fallbackSeoCopy(input: FortinetSeoInput): FortinetSeoCopy {
  const sku = normalizeFortinetSku(input.sku);
  const kind = kindLabel(input.subcategorySlug);
  const ports = specValue(input.specs, (label) => label.startsWith('port'));
  const throughput = specValue(
    input.specs,
    (label) => label.startsWith('keçid') || label.startsWith('firewall'),
  );

  const seoTitle = clampSeoText(
    `Fortinet ${sku} ${kind}`.replace(/\s+/g, ' ').trim(),
    SEO_TITLE_SOFT_MAX,
  );

  const parts = [
    `${input.title.trim()} (${sku}) — orijinal Fortinet ${kind}.`,
    ports ? `Portlar: ${ports}.` : null,
    throughput ? `${throughput}.` : null,
    'Rəsmi zəmanət və çatdırılma.',
  ].filter((part): part is string => part !== null);

  return {
    seoTitle,
    seoDescription: clampSeoText(parts.join(' '), SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(parts.join(' '), 700),
  };
}

export function resolveFortinetProductSeo(
  input: FortinetSeoInput,
): FortinetSeoCopy {
  const sku = normalizeFortinetSku(input.sku);
  const crafted = HANDCRAFTED_FORTINET_SEO[sku];
  if (crafted === undefined) {
    return fallbackSeoCopy(input);
  }
  return {
    seoTitle: crafted.seoTitle,
    seoDescription: crafted.seoDescription,
    pageIntro: crafted.pageIntro,
  };
}

export function buildFortinetProductDescription(
  pageIntro: string,
  specs: readonly FortinetSeoSpec[],
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

export function listHandcraftedFortinetSkus(): string[] {
  return Object.keys(HANDCRAFTED_FORTINET_SEO);
}
