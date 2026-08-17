/**
 * Hand-crafted OneScreen catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';
import { normalizeOneScreenSku } from './onescreen-product-name';

export type OneScreenSeoSpec = {
  label: string;
  value: string;
};

export type OneScreenSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type OneScreenSeoInput = {
  sku: string;
  title: string;
  specs: readonly OneScreenSeoSpec[];
  subcategorySlug: string;
};

type OneScreenSeoDraft = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

const HANDCRAFTED_ONESCREEN_SEO: Record<string, OneScreenSeoDraft> = {
  PANEL55: {
    seoTitle: 'OneScreen TL7 55" interaktiv lövhə',
    seoDescription:
      'OneScreen Panel55: TL7 55" 4K UHD, Android 11, 8 GB/64 GB və 40 toxunuş. Təhsil üçün orijinal OneScreen lövhə, rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'OneScreen TL7 55" interaktiv lövhə (Panel55) 4K UHD LED panel, Android 11, 8 GB RAM və 64 GB yaddaşa malikdir. Zero Bonding IR Gen2 40 nöqtə toxunuş, Wi-Fi 6, OPS yuvası və VESA 400×200 təhsil və ofis üçün nəzərdə tutulub. Orijinal OneScreen TL7 modelidir; 3 il rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'T7-65': {
    seoTitle: 'OneScreen T7 65" interaktiv lövhə',
    seoDescription:
      'OneScreen T7-65: 65" 4K UHD, Android 15 EDLA, 8 GB/128 GB və Wi-Fi 6E. Sinif və ofis üçün orijinal OneScreen T7, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'OneScreen T7 65" interaktiv lövhə (T7-65) DLED 4K UHD, Android 15 Google EDLA, Octa-core CPU, 8 GB RAM və 128 GB yaddaşa malikdir. 50 nöqtəyə qədər IR toxunuş, Wi-Fi 6E, 8-array mikrofon və OPS yuvası sinif və ofis üçün nəzərdə tutulub. Orijinal OneScreen T7 modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  PANEL75: {
    seoTitle: 'OneScreen T7 75" lövhə (Panel75)',
    seoDescription:
      'OneScreen Panel75: T7 75" 4K UHD, Android 15 EDLA, 8 GB/128 GB və Wi-Fi 6E. Böyük sinif üçün orijinal OneScreen, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'OneScreen T7 75" interaktiv lövhə (Panel75) DLED 4K UHD, Android 15 Google EDLA, 8 GB RAM və 128 GB yaddaşa malikdir. 50 nöqtə toxunuş, Wi-Fi 6E, NFC və OPS yuvası böyük sinif və konfrans zalı üçün nəzərdə tutulub. Təchizatçı SKU Panel75; orijinal OneScreen T7 modelidir, rəsmi zəmanət və çatdırılma ilə.',
  },
  'T7-75': {
    seoTitle: 'OneScreen T7 75" interaktiv lövhə',
    seoDescription:
      'OneScreen T7-75: 75" 4K UHD, Android 15 EDLA, 8 GB/128 GB və Wi-Fi 6E. Sinif və ofis üçün orijinal OneScreen T7, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'OneScreen T7 75" interaktiv lövhə (T7-75) DLED 4K UHD, Android 15 Google EDLA, Octa-core CPU, 8 GB RAM və 128 GB yaddaşa malikdir. 50 nöqtəyə qədər IR toxunuş, Wi-Fi 6E, 8-array mikrofon və OPS yuvası sinif və ofis üçün nəzərdə tutulub. Orijinal OneScreen T7 modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'OS-T7-75': {
    seoTitle: 'OneScreen T7 75" lövhə (OS-T7-75)',
    seoDescription:
      'OneScreen OS-T7-75: T7 75" 4K UHD, Android 15 EDLA, 8 GB/128 GB və Wi-Fi 6E. Sinif üçün orijinal OneScreen lövhə, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'OneScreen T7 75" interaktiv lövhə (OS-T7-75) DLED 4K UHD, Android 15 Google EDLA, 8 GB RAM və 128 GB yaddaşa malikdir. 50 nöqtə toxunuş, Wi-Fi 6E, NFC və OPS yuvası böyük sinif və konfrans zalı üçün nəzərdə tutulub. Təchizatçı SKU OS-T7-75; orijinal OneScreen T7 modelidir, rəsmi zəmanət və çatdırılma ilə.',
  },
  PANEL86: {
    seoTitle: 'OneScreen T7 86" lövhə (Panel86)',
    seoDescription:
      'OneScreen Panel86: T7 86" 4K UHD, Android 15 EDLA, 8 GB/128 GB və Wi-Fi 6E. Auditorium üçün orijinal OneScreen, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'OneScreen T7 86" interaktiv lövhə (Panel86) DLED 4K UHD, Android 15 Google EDLA, 8 GB RAM və 128 GB yaddaşa malikdir. 50 nöqtə toxunuş, Wi-Fi 6E, NFC və OPS yuvası auditorium və böyük zal üçün nəzərdə tutulub. Təchizatçı SKU Panel86; orijinal OneScreen T7 modelidir, rəsmi zəmanət və çatdırılma ilə.',
  },
  'T7-86': {
    seoTitle: 'OneScreen T7 86" interaktiv lövhə',
    seoDescription:
      'OneScreen T7-86: 86" 4K UHD, Android 15 EDLA, 8 GB/128 GB və Wi-Fi 6E. Böyük zal üçün orijinal OneScreen T7 lövhə, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'OneScreen T7 86" interaktiv lövhə (T7-86) DLED 4K UHD, Android 15 Google EDLA, Octa-core CPU, 8 GB RAM və 128 GB yaddaşa malikdir. 50 nöqtəyə qədər IR toxunuş, Wi-Fi 6E, 8-array mikrofon və OPS yuvası böyük zal üçün nəzərdə tutulub. Orijinal OneScreen T7 modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'OS-T7-86': {
    seoTitle: 'OneScreen T7 86" lövhə (OS-T7-86)',
    seoDescription:
      'OneScreen OS-T7-86: T7 86" 4K UHD, Android 15 EDLA, 8 GB/128 GB və Wi-Fi 6E. Auditorium üçün orijinal OneScreen, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'OneScreen T7 86" interaktiv lövhə (OS-T7-86) DLED 4K UHD, Android 15 Google EDLA, 8 GB RAM və 128 GB yaddaşa malikdir. 50 nöqtə toxunuş, Wi-Fi 6E, NFC və OPS yuvası auditorium və böyük zal üçün nəzərdə tutulub. Təchizatçı SKU OS-T7-86; orijinal OneScreen T7 modelidir, rəsmi zəmanət və çatdırılma ilə.',
  },
  CORE65: {
    seoTitle: 'OneScreen Core 65" interaktiv lövhə',
    seoDescription:
      'OneScreen Core65: 65" 4K UHD, Android 14 EDLA, 8 GB/128 GB və 40 toxunuş. Təhsil üçün orijinal OneScreen Core lövhə, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'OneScreen Core 65" interaktiv lövhə (Core65) DLED 4K UHD, Android 14 Google EDLA, Octa-core CPU, 8 GB RAM və 128 GB yaddaşa malikdir. 40 nöqtəyə qədər IR toxunuş, Wi-Fi 6E və OPS yuvası təhsil və ofis üçün nəzərdə tutulub. Orijinal OneScreen Core modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  CORE75: {
    seoTitle: 'OneScreen Core 75" interaktiv lövhə',
    seoDescription:
      'OneScreen Core75: 75" 4K UHD, Android 14 EDLA, 8 GB/128 GB və 40 toxunuş. Sinif üçün orijinal OneScreen Core lövhə, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'OneScreen Core 75" interaktiv lövhə (Core75) DLED 4K UHD, Android 14 Google EDLA, Octa-core CPU, 8 GB RAM və 128 GB yaddaşa malikdir. 40 nöqtəyə qədər IR toxunuş, Wi-Fi 6E və OPS yuvası sinif və ofis üçün nəzərdə tutulub. Orijinal OneScreen Core modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  CORE86: {
    seoTitle: 'OneScreen Core 86" interaktiv lövhə',
    seoDescription:
      'OneScreen Core86: 86" 4K UHD, Android 14 EDLA, 8 GB/128 GB və 40 toxunuş. Böyük zal üçün orijinal OneScreen Core, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'OneScreen Core 86" interaktiv lövhə (Core86) DLED 4K UHD, Android 14 Google EDLA, Octa-core CPU, 8 GB RAM və 128 GB yaddaşa malikdir. 40 nöqtəyə qədər IR toxunuş, Wi-Fi 6E və OPS yuvası böyük zal üçün nəzərdə tutulub. Orijinal OneScreen Core modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'ONESCREEN-I5-L7': {
    seoTitle: 'OneScreen OPS PC i5 16GB/256GB',
    seoDescription:
      'OneScreen OPS PC i5: i5-12450H, 16 GB DDR4, 256 GB SSD və Windows 11. Yalnız T7 OPS yuvası üçün orijinal modul, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'OneScreen OPS PC i5 16GB/256GB (OneScreen-i5-L7) Intel Core i5-12450H, 16 GB DDR4, 256 GB M.2 SATA SSD və Windows 11 ilə Open Pluggable Specification moduludur. Wi-Fi 6, TPM 2.0 və HDMI out yalnız T7 seriyası OPS yuvası üçündür. Orijinal OneScreen OPS PC-dir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'ONESCREEN-I7-L7': {
    seoTitle: 'OneScreen OPS PC i7 16GB/256GB',
    seoDescription:
      'OneScreen OPS PC i7: i7-1195G7, 16 GB DDR4, 256 GB SSD və Windows 11. Yalnız T7 OPS yuvası üçün orijinal modul, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'OneScreen OPS PC i7 16GB/256GB (OneScreen-i7-L7) Intel Core i7-1195G7, 16 GB DDR4, 256 GB M.2 SATA SSD və Windows 11 ilə Open Pluggable Specification moduludur. Wi-Fi 6, TPM 2.0 və HDMI out yalnız T7 seriyası OPS yuvası üçündür. Orijinal OneScreen OPS PC-dir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'OS-MOBILE-CART': {
    seoTitle: 'OneScreen mobil stend 86"-dək',
    seoDescription:
      'OneScreen OS Mobile Cart: 65–86" panellər, əl hündürlük, VESA və əyləcli təkər. Interaktiv lövhə üçün orijinal stend, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'OneScreen mobil stend (OS-Mobile-Cart) 65–86" interaktiv panellər üçün əl ilə tənzimlənən hündürlüklü stenddir. VESA 100×100–900×600 mm, 100 kq yükgötürmə, əyləcli təkərlər və aksesuar rəfi sinif və ofis üçün nəzərdə tutulub. Orijinal OneScreen Mobile Cart-dır; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  ONESCREENCAST: {
    seoTitle: 'OneScreen Cast simsiz ekran paylaşımı',
    seoDescription:
      'OneScreen Cast: USB-C/A dongle, Wi-Fi 6, 4K 30 fps və toxunuş geri. Panelə BYOM üçün orijinal Cast2 cihazı, rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'OneScreen Cast simsiz ekran paylaşımı (OneScreenCast) USB Type-C + USB-A adapterli Cast2 dongledir. Wi-Fi 6, 4K UHD 30 fps / Full HD 60 fps, 10 nöqtəyə qədər toxunuş geri və BYOM kamera/mikrofon dəstəyi noutbukdan panelə paylaşım üçündür. Orijinal OneScreen Cast modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  ONESCREENWEBCAM: {
    seoTitle: 'OneScreen TrackCam 4K EPTZ kamera',
    seoDescription:
      'OneScreen TrackCam: 4K EPTZ, AI auto-framing, 110° HFOV və mikrofon array. Konfrans üçün orijinal OneScreen kamera, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'OneScreen TrackCam 4K EPTZ kamera (OneScreenWebCam) 1/2.7" CMOS, 4K@30 fps, elektron pan/tilt/zoom, AI auto-framing və presenter tracking ilə konfrans kamerasıdır. 110° HFOV, inteqrasiya mikrofon array, pult və privacy cover OneScreen panellər və PC üçündür. Orijinal OneScreen TrackCam-dır; 1 il rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
};

function kindLabel(subcategorySlug: string): string {
  const bySlug: Record<string, string> = {
    'interaktiv-lovhe': 'interaktiv lövhə',
    'mini-pc': 'OPS PC',
    'monitor-stendi': 'monitor stendi',
    'ekran-paylasimi': 'ekran paylaşımı',
    'konfrans-kamerasi': 'konfrans kamerası',
  };
  return bySlug[subcategorySlug] ?? 'avadanlıq';
}

function fallbackSeoCopy(input: OneScreenSeoInput): OneScreenSeoCopy {
  const sku = normalizeOneScreenSku(input.sku);
  const kind = kindLabel(input.subcategorySlug);
  const diagonal = input.specs.find((entry) =>
    entry.label.toLocaleLowerCase('az').startsWith('diaqonal'),
  )?.value;

  const seoTitle = clampSeoText(
    `OneScreen ${sku} ${kind}`.replace(/\s+/g, ' ').trim(),
    SEO_TITLE_SOFT_MAX,
  );

  const parts = [
    `${input.title.trim()} (${sku}) — orijinal OneScreen ${kind}.`,
    diagonal ? `Diaqonal: ${diagonal}.` : null,
    'Rəsmi zəmanət və çatdırılma.',
  ].filter((part): part is string => part !== null);

  return {
    seoTitle,
    seoDescription: clampSeoText(parts.join(' '), SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(parts.join(' '), 700),
  };
}

export function resolveOneScreenProductSeo(
  input: OneScreenSeoInput,
): OneScreenSeoCopy {
  const sku = normalizeOneScreenSku(input.sku);
  const crafted = HANDCRAFTED_ONESCREEN_SEO[sku];
  if (crafted === undefined) {
    return fallbackSeoCopy(input);
  }
  return {
    seoTitle: crafted.seoTitle,
    seoDescription: crafted.seoDescription,
    pageIntro: crafted.pageIntro,
  };
}

export function buildOneScreenProductDescription(
  pageIntro: string,
  specs: readonly OneScreenSeoSpec[],
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

export function listHandcraftedOneScreenSkus(): string[] {
  return Object.keys(HANDCRAFTED_ONESCREEN_SEO);
}
