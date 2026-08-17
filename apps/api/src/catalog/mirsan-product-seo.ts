/**
 * Hand-crafted Mirsan catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';
import { normalizeMirsanSku } from './mirsan-product-name';

export type MirsanSeoSpec = {
  label: string;
  value: string;
};

export type MirsanSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type MirsanSeoInput = {
  sku: string;
  title: string;
  specs: readonly MirsanSeoSpec[];
  subcategorySlug: string;
};

type MirsanSeoDraft = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

const HANDCRAFTED_MIRSAN_SEO: Record<string, MirsanSeoDraft> = {
  'MR.FAN2WT.01': {
    seoTitle: 'Mirsan 2-fan termostatlı ventilyator paneli',
    seoDescription:
      'Mirsan MR.FAN2WT.01: 2 fan, analog termostat və 230 V AC. Rack tavanı üçün orijinal ventilyator paneli, 36 ay rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Mirsan 2-fan analog termostatlı ventilyator paneli (MR.FAN2WT.01) GT, WTE, WTO, SOHO və WTC/WTN şkaflarının tavanına quraşdırılan 2 fanlı soyutma moduludur. Analog termostat, işıqlı On/Off açar, hər fan 2.22–2.70 m³/dəq və 230/250 V AC qidalanma server otağı üçün nəzərdə tutulub. Alüminium gövdə, RAL 9005 qara; CE. Orijinal Mirsan MR.FAN modelidir; 36 ay rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'MR.WTC12U66MN.02': {
    seoTitle: 'Mirsan WTC Com-Box 12U 600×600 divar şkafı',
    seoDescription:
      'Mirsan MR.WTC12U66MN.02: 12U, 600×600 mm, şüşə qapı, yük 80 kq. Ofis üçün orijinal yığılı divar şkafı, 36 ay rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Mirsan WTC Com-Box 12U 600×600 divar şkafı (MR.WTC12U66MN.02) 19" yığılı wall-type şəbəkə şkafıdır. Daxili 509 mm / 12U, 600×600×577 mm, 4 tənzimlənən 19" rels (401 mm), 80 kq yük və şüşə qapı ofis və IDF üçün nəzərdə tutulub. Boz RAL 7035, IP20, tavanda 2 fan yeri. Orijinal Mirsan WT Com-Box modelidir; 36 ay rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'MR.WTC09U66MN.02': {
    seoTitle: 'Mirsan WTC Com-Box 9U 600×600 divar şkafı',
    seoDescription:
      'Mirsan MR.WTC09U66MN.02: 9U, 600×600 mm, şüşə qapı, yük 80 kq. Kiçik ofis üçün orijinal yığılı divar şkafı, 36 ay rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Mirsan WTC Com-Box 9U 600×600 divar şkafı (MR.WTC09U66MN.02) 19" yığılı wall-type şəbəkə şkafıdır. Daxili 375 mm / 9U, 600×600×443 mm, 4 tənzimlənən 19" rels (401 mm), 80 kq yük və şüşə qapı kiçik ofis və patch panel üçün nəzərdə tutulub. Boz RAL 7035, IP20, tavanda 2 fan yeri. Orijinal Mirsan WT Com-Box modelidir; 36 ay rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'MR.GTN42U61.01_PRF63': {
    seoTitle: 'Mirsan GTN 42U 600×1000 şəbəkə şkafı',
    seoDescription:
      'Mirsan MR.GTN42U61.01_PRF63: 42U, 600×1000 mm, 63% perforasiya, 600 kq. Server otağı üçün orijinal GTN şkaf, 36 ay rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Mirsan GTN 42U 600×1000 şəbəkə şkafı (MR.GTN42U61.01_PRF63) 19" yerüstü GT Network W-600 kabinetidir. 600×1000×2006 mm, 42U, 600 kq statik yük, ön/arxa 63% perforasiyalı qapı və 4 tənzimlənən 19" rels data mərkəzi üçün nəzərdə tutulub. Qara RAL 9005, IP20, tavanda 6 fan-a qədər yer. Orijinal Mirsan GTN modelidir; 36 ay rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'MR.HD.GTN42U81.01_PRF63': {
    seoTitle: 'Mirsan GTN 42U 800×1000 şəbəkə şkafı',
    seoDescription:
      'Mirsan MR.HD.GTN42U81.01_PRF63: 42U, 800×1000 mm, 63% perforasiya, 800 kq. Data mərkəzi üçün orijinal GTN şkaf, 36 ay rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Mirsan GTN 42U 800×1000 şəbəkə şkafı (MR.HD.GTN42U81.01_PRF63) 19" yerüstü GT Network W-800 kabinetidir. 800×1000×2006 mm, 42U, 800 kq statik yük, ön/arxa 63% perforasiyalı qapı və tənzimlənən 19" rels geniş kabel idarəetməsi üçün nəzərdə tutulub. Qara RAL 9005, IP20, tavanda 6 fan-a qədər yer. Orijinal Mirsan GTN modelidir; 36 ay rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'MR.GTS42U812.01': {
    seoTitle: 'Mirsan GTS 42U 800×1200 server şkafı',
    seoDescription:
      'Mirsan MR.GTS42U812.01: 42U, 800×1200 mm, 2000 kq, 63% perforasiya. Rack server üçün orijinal GTS şkaf, 36 ay rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Mirsan GTS 42U 800×1200 server şkafı (MR.GTS42U812.01) yüksək yüklü 19" GT Server kabinetidir. 800×1200×2027 mm, 42U, 2000 kq statik yük, qaynaqlı çərçivə və (19")³ yan montaj rack server üçün nəzərdə tutulub. Ön qabarıq 63% perforasiyalı qapı, ikiqanadlı arxa qapı, qara RAL 9005. Orijinal Mirsan GTS modelidir; 36 ay rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'MR.PRZ1U10O.PRFR.SC': {
    seoTitle: 'Mirsan Basic PDU 1U 10×Schuko surge 16A',
    seoDescription:
      'Mirsan MR.PRZ1U10O.PRFR.SC: 10×Schuko, surge qoruma, açar, 16 A / 4000 W. 19" 1U rack üçün orijinal Basic PDU, 36 ay rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Mirsan Basic PDU 1U 10×Schuko, surge, açar, 16A (MR.PRZ1U10O.PRFR.SC) üfüqi 19" 1U qida paylama blokudur. 10 × Type F Schuko, parafudr, işıqlı On/Off açar, 16 A / 4000 W və 1.5 m H05VV-F kabel rack şkafı üçün nəzərdə tutulub. Anodlaşdırılmış alüminium profil, IP20, CE. Orijinal Mirsan MR.PRZ modelidir; 36 ay rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'MR.PRZ42U2412D.SC': {
    seoTitle: 'Mirsan Basic PDU 42U 24×Schuko 16A',
    seoDescription:
      'Mirsan MR.PRZ42U2412D.SC: 24×Schuko, 16 A MCB, 4000 W. 42U şkafın 0U yan profili üçün orijinal Basic PDU, 36 ay rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Mirsan Basic PDU 42U 24×Schuko, 16A, MCB (MR.PRZ42U2412D.SC) şaquli 0U qida paylama blokudur. 24 × Type F Schuko, 16 A miniatür avtomat, 16 A / 4000 W və 1.5 m H05VV-F kabel 42U şkafın yan profilinə montaj üçündür. Schuko fiş, IP20, CE. Orijinal Mirsan MR.PRZ modelidir; 36 ay rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'MR.PRZ42U20XC13-4XC19': {
    seoTitle: 'Mirsan Basic PDU 42U C13/C19 16A V/A',
    seoDescription:
      'Mirsan MR.PRZ42U20XC13-4XC19: 20×C13+4×C19, V/A indikator, 16 A MCB. 0U şkaf üçün orijinal metrlikli PDU, 36 ay rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Mirsan Basic PDU 42U 20×C13+4×C19, V/A, 16A (MR.PRZ42U20XC13-4XC19) şaquli 0U metrlikli qida paylama blokudur. 20 × IEC C13 + 4 × IEC C19, volt/amper göstərici, 16 A MCB və IEC 60309 fiş IT avadanlığı üçün nəzərdə tutulub. 3 m 3×1.5 mm² kabel, 16 A / 4000 W, IP20. Orijinal Mirsan MR.PRZ modelidir; 36 ay rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'MR.PRZ42U20XC13-4XC19.AMP.PDU': {
    seoTitle: 'Mirsan Basic PDU 42U C13/C19 32A V/A',
    seoDescription:
      'Mirsan MR.PRZ42U20XC13-4XC19.AMP.PDU: 20×C13+4×C19, V/A, 32 A MCB. Yüksək güc 0U şkaf üçün orijinal PDU, 36 ay rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Mirsan Basic PDU 42U 20×C13+4×C19, V/A, 32A (MR.PRZ42U20XC13-4XC19.AMP.PDU) şaquli 0U metrlikli qida paylama blokudur. 20 × IEC C13 + 4 × IEC C19, volt/amper göstərici, 32 A MCB və IEC 60309 fiş yüksək güclü IT yükü üçün nəzərdə tutulub. 3 m 3×2.5 mm² kabel, 32 A / 8000 W, IP20. Orijinal Mirsan MR.PRZ modelidir; 36 ay rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'MR.PRZ42U2422D.SC': {
    seoTitle: 'Mirsan Basic PDU 42U 24×Schuko 32A',
    seoDescription:
      'Mirsan MR.PRZ42U2422D.SC: 24×Schuko, 32 A MCB, 8000 W. 42U şkafın 0U yan profili üçün orijinal Basic PDU, 36 ay rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Mirsan Basic PDU 42U 24×Schuko, 32A, MCB (MR.PRZ42U2422D.SC) şaquli 0U qida paylama blokudur. 24 × Type F Schuko, 32 A miniatür avtomat, 32 A / 8000 W və IEC 60309 sənaye fişi yüksək yüklü şkaf üçün nəzərdə tutulub. 2.5 m 3×2.5 mm² kabel, IP20, CE. Orijinal Mirsan MR.PRZ modelidir; 36 ay rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'MR.PRZ42U24P.C13': {
    seoTitle: 'Mirsan Basic PDU 42U C13/C19 2×16A',
    seoDescription:
      'Mirsan MR.PRZ42U24P.C13: 20×C13+4×C19, iki dövrə, 2×16 A MCB, 32 A. Şaquli 0U IEC şkaf PDU-su, 36 ay rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Mirsan Basic PDU 42U 20×C13+4×C19, 32A, 2×16A MCB (MR.PRZ42U24P.C13) iki dövrəli şaquli 0U qida paylama blokudur. 20 × IEC C13 + 4 × IEC C19, 2 × 16 A avtomat, 32 A / 8000 W və IEC 60309 fiş ayrı qorunan qruplar üçün nəzərdə tutulub. 2 m 3×4 mm² kabel, IP20, CE. Orijinal Mirsan MR.PRZ modelidir; 36 ay rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'MR.PRZ42U24D.SC': {
    seoTitle: 'Mirsan Basic PDU 42U 24×Schuko 2×16A',
    seoDescription:
      'Mirsan MR.PRZ42U24D.SC: 24×Schuko, iki dövrə, 2×16 A MCB, 32 A / 8000 W. Şaquli 0U orijinal Schuko PDU, 36 ay rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Mirsan Basic PDU 42U 24×Schuko, 32A, 2×16A MCB (MR.PRZ42U24D.SC) iki dövrəli şaquli 0U qida paylama blokudur. 24 × Type F Schuko, 2 × 16 A avtomat, 32 A / 8000 W və IEC 60309 fiş ayrı qorunan rozetka qrupları üçün nəzərdə tutulub. 2 m 3×4 mm² kabel, IP20, CE. Orijinal Mirsan MR.PRZ modelidir; 36 ay rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'MR.PRZ42U24D.MCB.IE': {
    seoTitle: 'Mirsan Basic PDU 42U C13/C19 32A MCB',
    seoDescription:
      'Mirsan MR.PRZ42U24D.MCB.IE: 20×C13+4×C19, 32 A MCB, 8000 W. 42U IEC rack şkaf üçün orijinal Basic PDU, 36 ay rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Mirsan Basic PDU 42U 20×C13+4×C19, 32A, MCB (MR.PRZ42U24D.MCB.IE) şaquli 0U qida paylama blokudur. 20 × IEC C13 + 4 × IEC C19, 32 A miniatür avtomat, 32 A / 8000 W və IEC 60309 fiş IT rack üçün nəzərdə tutulub. 2 m 3×2.5 mm² kabel, IP20, CE. Orijinal Mirsan MR.PRZ modelidir; 36 ay rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
};

function kindLabel(subcategorySlug: string): string {
  const bySlug: Record<string, string> = {
    'rack-aksesuarlari': 'rack aksesuarı',
    'divar-skafi': 'divar şkafı',
    'sebeke-skafi': 'şəbəkə şkafı',
    'server-skafi': 'server şkafı',
    pdu: 'PDU',
  };
  return bySlug[subcategorySlug] ?? 'avadanlıq';
}

function fallbackSeoCopy(input: MirsanSeoInput): MirsanSeoCopy {
  const sku = normalizeMirsanSku(input.sku);
  const kind = kindLabel(input.subcategorySlug);
  const seoTitle = clampSeoText(
    `Mirsan ${sku} ${kind}`.replace(/\s+/g, ' ').trim(),
    SEO_TITLE_SOFT_MAX,
  );
  const parts = [
    `${input.title.trim()} (${sku}) — orijinal Mirsan ${kind}.`,
    'Rəsmi zəmanət və çatdırılma.',
  ];
  return {
    seoTitle,
    seoDescription: clampSeoText(parts.join(' '), SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(parts.join(' '), 700),
  };
}

export function resolveMirsanProductSeo(input: MirsanSeoInput): MirsanSeoCopy {
  const sku = normalizeMirsanSku(input.sku);
  const crafted = HANDCRAFTED_MIRSAN_SEO[sku];
  if (crafted === undefined) {
    return fallbackSeoCopy(input);
  }
  return {
    seoTitle: crafted.seoTitle,
    seoDescription: crafted.seoDescription,
    pageIntro: crafted.pageIntro,
  };
}

export function buildMirsanProductDescription(
  pageIntro: string,
  specs: readonly MirsanSeoSpec[],
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

export function listHandcraftedMirsanSkus(): string[] {
  return Object.keys(HANDCRAFTED_MIRSAN_SEO);
}
