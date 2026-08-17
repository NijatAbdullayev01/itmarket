/**
 * Hand-crafted Xerox catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';
import {
  isXeroxCompatibleSupply,
  normalizeXeroxSku,
} from './xerox-product-name';

export type XeroxSeoSpec = {
  label: string;
  value: string;
};

export type XeroxSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type XeroxSeoInput = {
  sku: string;
  title: string;
  specs: readonly XeroxSeoSpec[];
  subcategorySlug: string;
};

type XeroxSeoDraft = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

const HANDCRAFTED_XEROX_SEO: Record<string, XeroxSeoDraft> = {
  C325V_DNI: {
    seoTitle: 'Xerox C325 DNI rəngli lazer MFP',
    seoDescription:
      'Xerox C325V_DNI: 33 ppm A4 rəngli lazer MFP, Wi-Fi, duplex və DADF. Kiçik ofis üçün orijinal Xerox C325, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Xerox C325 DNI rəngli lazer MFP (C325V_DNI) A4 print/copy/scan/fax cihazıdır. 33 ppm A4 (rəng və ağ-qara), avtomatik duplex, 4.3" toxunma paneli, 50 vərəq single-pass DADF, Gigabit Ethernet və Wi-Fi kiçik ofis üçün nəzərdə tutulub. Rəsmi ad VersaLink deyil — Xerox C325 seriyasıdır. Orijinal Xerox modelidir; 1 il rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  C235V_DNI: {
    seoTitle: 'Xerox C235 DNI rəngli lazer MFP',
    seoDescription:
      'Xerox C235V_DNI: 22 ppm A4 rəngli lazer MFP, Wi-Fi, duplex və ADF. Ev ofisi üçün orijinal Xerox C235, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Xerox C235 DNI rəngli lazer MFP (C235V_DNI) A4 print/copy/scan/fax cihazıdır. 22 ppm A4, avtomatik duplex, 2.8" toxunma paneli, 50 vərəq ADF, Ethernet və Wi-Fi ev ofisi üçün nəzərdə tutulub. 512 MB RAM; starter CMYK 500 səh. Orijinal Xerox C235 modelidir; 1 il rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  C415V_DN: {
    seoTitle: 'Xerox VersaLink C415 DN rəngli MFP',
    seoDescription:
      'Xerox C415V_DN: 40 ppm A4 rəngli VersaLink MFP, 7" panel və DADF. Ofis üçün orijinal ConnectKey cihaz, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Xerox VersaLink C415 DN rəngli lazer MFP (C415V_DN) ConnectKey A4 print/copy/scan/fax cihazıdır. 40 ppm A4, 7" planşet paneli, 100 vərəq single-pass DADF və Gigabit Ethernet ofis üçün nəzərdə tutulub. Bu DN SKU-da Wi-Fi standart deyil — opsional Dual Band kitdir. Orijinal Xerox VersaLink modelidir; 1 il on-site zəmanət və çatdırılma ilə.',
  },
  B225V_DNI: {
    seoTitle: 'Xerox B225 DNI ağ-qara lazer MFP',
    seoDescription:
      'Xerox B225V_DNI: 34 ppm A4 ağ-qara MFP, Wi-Fi və duplex, faks yoxdur. Kiçik ofis üçün orijinal Xerox B225, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Xerox B225 DNI lazer MFP (B225V_DNI) A4 print/copy/scan cihazıdır — faks yoxdur. 34 ppm A4, avtomatik duplex, 50 vərəq ADF, Ethernet və Wi-Fi kiçik ofis üçün nəzərdə tutulub. LCD panel B235-dəki 2.8" rəngli ekrandan fərqlidir. Orijinal Xerox B225 modelidir; 1 il rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  B235V_DNI: {
    seoTitle: 'Xerox B235 DNI lazer MFP faks ilə',
    seoDescription:
      'Xerox B235V_DNI: 34 ppm A4 ağ-qara MFP, faks, 2.8" panel və Wi-Fi. Ofis üçün orijinal Xerox B235, rəsmi zəmanət və çatdırılma ilə Azərbaycanda satılır.',
    pageIntro:
      'Xerox B235 DNI lazer MFP (B235V_DNI) A4 print/copy/scan/fax cihazıdır. 34 ppm A4, avtomatik duplex, 2.8" rəngli toxunma paneli, 50 vərəq ADF, Ethernet və Wi-Fi ofis üçün nəzərdə tutulub. B225-ə faks, rəngli panel və USB-dən çap əlavə edir. Orijinal Xerox B235 modelidir; 1 il rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  B305V_DNI: {
    seoTitle: 'Xerox B305 DNI 38 ppm lazer MFP',
    seoDescription:
      'Xerox B305V_DNI: 38 ppm A4 ağ-qara MFP, Wi-Fi və 100 vərəq MPT. Orta ofis üçün orijinal Xerox B305, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Xerox B305 DNI lazer MFP (B305V_DNI) A4 print/copy/scan cihazıdır — faks yoxdur. 38 ppm A4, avtomatik duplex, 2.8" panel, 50 vərəq ADF və 250+100 kağız yolu orta ofis üçün nəzərdə tutulub. Single-pass DADF və faks B315-dədir. Orijinal Xerox B305 modelidir; 1 il rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  B315V_DNI: {
    seoTitle: 'Xerox B315 DNI lazer MFP DADF',
    seoDescription:
      'Xerox B315V_DNI: 40 ppm A4 ağ-qara MFP, faks, DADF və Wi-Fi. Ofis üçün orijinal Xerox B315, rəsmi zəmanət və çatdırılma ilə Azərbaycanda satılır.',
    pageIntro:
      'Xerox B315 DNI lazer MFP (B315V_DNI) A4 print/copy/scan/fax cihazıdır. 40 ppm A4, avtomatik duplex, 2.8" panel, 50 vərəq single-pass DADF, Ethernet və Wi-Fi ofis üçün nəzərdə tutulub. B305-ə faks və 2-tərəfli skan əlavə edir; starter 2 500 səh. Orijinal Xerox B315 modelidir; 1 il rəsmi zəmanət və çatdırılma ilə.',
  },
  B415V_DN: {
    seoTitle: 'Xerox VersaLink B415 DN lazer MFP',
    seoDescription:
      'Xerox B415V_DN: 47 ppm A4 VersaLink MFP, 7" panel və 100 vərəq DADF. İş qrupu üçün orijinal ConnectKey, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Xerox VersaLink B415 DN lazer MFP (B415V_DN) ConnectKey A4 print/copy/scan/fax cihazıdır. 47 ppm A4, 7" planşet paneli, 100 vərəq DADF, 550+100 kağız yolu və Gigabit Ethernet iş qrupu üçün nəzərdə tutulub. Bu DN SKU-da Wi-Fi opsional kitdir. Orijinal Xerox VersaLink modelidir; 1 il on-site zəmanət və çatdırılma ilə təqdim olunur.',
  },
  '3025V_BI': {
    seoTitle: 'Xerox WorkCentre 3025BI lazer MFP',
    seoDescription:
      'Xerox 3025V_BI: 20 ppm A4 WorkCentre MFP, Wi-Fi və USB, Ethernet yoxdur. Ev ofisi üçün orijinal Xerox, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Xerox WorkCentre 3025BI lazer MFP (3025V_BI) A4 print/copy/scan cihazıdır. 20 ppm A4, Wi-Fi və USB; Ethernet, faks və ADF yoxdur — BI konfiqurasiyası ev ofisi üçündür. Duplex əl ilədir; kağız 150+1. Orijinal Xerox WorkCentre 3025 modelidir; 1 il rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  '3025V_NI': {
    seoTitle: 'Xerox WorkCentre 3025NI lazer MFP',
    seoDescription:
      'Xerox 3025V_NI: 20 ppm A4 WorkCentre MFP, Ethernet, Wi-Fi, faks və ADF. Kiçik ofis üçün orijinal Xerox, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Xerox WorkCentre 3025NI lazer MFP (3025V_NI) A4 print/copy/scan/fax cihazıdır. 20 ppm A4, Ethernet, Wi-Fi, 40 vərəq ADF və faks kiçik ofis üçün nəzərdə tutulub. 3025BI-dən fərqli olaraq şəbəkə portu və avtomatik sənəd qidalandırıcı var. Orijinal Xerox WorkCentre 3025 modelidir; 1 il rəsmi zəmanət və çatdırılma ilə.',
  },
  B230V_DNI: {
    seoTitle: 'Xerox B230 DNI ağ-qara lazer printer',
    seoDescription:
      'Xerox B230V_DNI: 34 ppm A4 lazer printer, Wi-Fi və duplex — MFP deyil. Ofis çapı üçün orijinal Xerox B230, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Xerox B230 DNI lazer printer (B230V_DNI) yalnız çap üçündür — copy/scan/fax yoxdur. 34 ppm A4, avtomatik duplex, Ethernet və Wi-Fi masaüstü ofis çapı üçün nəzərdə tutulub. 256 MB RAM; kağız 250+1. Orijinal Xerox B230 modelidir; 1 il rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  B310V_DNI: {
    seoTitle: 'Xerox B310 DNI 40 ppm lazer printer',
    seoDescription:
      'Xerox B310V_DNI: 40 ppm A4 lazer printer, PCL/PS, Wi-Fi və duplex. İş qrupu çapı üçün orijinal Xerox B310, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Xerox B310 DNI lazer printer (B310V_DNI) yalnız çap üçündür — MFP deyil. 40 ppm A4, avtomatik duplex, PostScript 3 emulation, PCL 5/6, Ethernet və Wi-Fi iş qrupu üçün nəzərdə tutulub. 250+100 kağız yolu; starter 2 500 səh. Orijinal Xerox B310 modelidir; 1 il rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  '3020V_BI': {
    seoTitle: 'Xerox Phaser 3020BI lazer printer',
    seoDescription:
      'Xerox 3020V_BI: 20 ppm A4 Phaser lazer printer, Wi-Fi və USB. Ev ofisi üçün kompakt orijinal Xerox, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Xerox Phaser 3020BI lazer printer (3020V_BI) kompakt A4 çap cihazıdır. 20 ppm A4, Wi-Fi və USB; Ethernet yoxdur. Duplex əl ilədir; 150+1 kağız, 4.1 kq. Orijinal Xerox Phaser 3020 modelidir; 1 il rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'GG-106R02773': {
    seoTitle: 'G&G 106R02773 uyğun qara toner',
    seoDescription:
      'G&G 106R02773: Phaser 3020 və WorkCentre 3025 üçün uyğun qara toner kartrici, 1 500 səh. Orijinal Xerox deyil — çatdırılma ilə Azərbaycanda satılır.',
    pageIntro:
      'G&G 106R02773 uyğun qara toner (GG-106R02773) Xerox Phaser 3020, WorkCentre 3025BI və 3025NI üçün compatible kartricdir. Tutum 1 500 səh (ISO/IEC 19752 istinadı); rəng qara. Bu SKU orijinal Xerox Genuine 106R02773 deyil — G&G dublikat/uyğun kartricdir. Çatdırılma ilə sifarişlə təqdim olunur.',
  },
  '006R04404': {
    seoTitle: 'Xerox 006R04404 qara Extra HC toner',
    seoDescription:
      'Xerox 006R04404: qara Extra High Capacity toner, 6 000 səh, B225/B230/B235. Orijinal Xerox Genuine, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Xerox 006R04404 qara Extra High Capacity toner B225, B230 və B235 üçün DMO region Genuine kartricdir. Tutum 6 000 səh (ISO/IEC 19752); NA/XE ekvivalenti 006R04401. Orijinal Xerox supplies-dir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  '006R04379': {
    seoTitle: 'Xerox 006R04379 qara toner B305',
    seoDescription:
      'Xerox 006R04379: qara Standard Capacity toner, 3 000 səh, B305/B310/B315. Orijinal Xerox Genuine, rəsmi zəmanət və çatdırılma ilə Azərbaycanda satılır.',
    pageIntro:
      'Xerox 006R04379 qara Standard Capacity toner B305, B310 və B315 üçün DMO region Genuine kartricdir. Tutum 3 000 səh (ISO/IEC 19752); NA/XE ekvivalenti 006R04376. Orijinal Xerox supplies-dir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  '006R04387': {
    seoTitle: 'Xerox 006R04387 qara toner C230/C235',
    seoDescription:
      'Xerox 006R04387: qara Standard Capacity toner, 1 500 səh, C230/C235. Rəngli seriya üçün orijinal Xerox Genuine, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Xerox 006R04387 qara Standard Capacity toner C230 və C235 rəngli lazer seriyası üçün DMO Genuine kartricdir. Tutum 1 500 səh (ISO/IEC 19798); NA/XE ekvivalenti 006R04383. Orijinal Xerox supplies-dir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  '006R04388': {
    seoTitle: 'Xerox 006R04388 Cyan toner C230/C235',
    seoDescription:
      'Xerox 006R04388: Cyan Standard Capacity toner, 1 500 səh, C230/C235. Mavi çalar üçün orijinal Xerox Genuine, rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Xerox 006R04388 Cyan Standard Capacity toner C230 və C235 üçün DMO Genuine kartricdir. Tutum 1 500 səh (ISO/IEC 19798); NA/XE ekvivalenti 006R04384. Orijinal Xerox Cyan supplies-dir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  '006R04389': {
    seoTitle: 'Xerox 006R04389 Magenta toner C230/C235',
    seoDescription:
      'Xerox 006R04389: Magenta Standard Capacity, 1 500 səh, C230/C235. Bənövşəyi çalar üçün orijinal Xerox Genuine, rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Xerox 006R04389 Magenta Standard Capacity toner C230 və C235 üçün DMO Genuine kartricdir. Tutum 1 500 səh (ISO/IEC 19798); NA/XE ekvivalenti 006R04385. Orijinal Xerox Magenta supplies-dir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  '006R04390': {
    seoTitle: 'Xerox 006R04390 Yellow toner C230/C235',
    seoDescription:
      'Xerox 006R04390: Yellow Standard Capacity toner, 1 500 səh, C230/C235. Sarı çalar üçün orijinal Xerox Genuine, rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Xerox 006R04390 Yellow Standard Capacity toner C230 və C235 üçün DMO Genuine kartricdir. Tutum 1 500 səh (ISO/IEC 19798); NA/XE ekvivalenti 006R04386. Orijinal Xerox Yellow supplies-dir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  '006R04827': {
    seoTitle: 'Xerox 006R04827 qara toner C320/C325',
    seoDescription:
      'Xerox 006R04827: qara Standard Capacity toner, 2 200 səh, C320/C325. C325 MFP üçün orijinal Xerox Genuine, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Xerox 006R04827 qara Standard Capacity toner C320 və C325 üçün DMO Genuine kartricdir. Tutum 2 200 səh (ISO/IEC 19798); NA/XE ekvivalenti 006R04823. Orijinal Xerox supplies-dir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  '006R04824': {
    seoTitle: 'Xerox 006R04824 Cyan toner C320/C325',
    seoDescription:
      'Xerox 006R04824: Cyan Standard Capacity toner, 1 800 səh, C320/C325. C325 rəngi üçün orijinal Xerox Genuine, rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Xerox 006R04824 Cyan Standard Capacity toner C320 və C325 üçün DMO Genuine kartricdir. Tutum 1 800 səh (ISO/IEC 19798); NA/XE ekvivalenti 006R04820. Orijinal Xerox Cyan supplies-dir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  '006R04825': {
    seoTitle: 'Xerox 006R04825 Magenta toner C320/C325',
    seoDescription:
      'Xerox 006R04825: Magenta Standard Capacity, 1 800 səh, C320/C325. C325 rəngi üçün orijinal Xerox Genuine, rəsmi zəmanət və çatdırılma ilə satılır.',
    pageIntro:
      'Xerox 006R04825 Magenta Standard Capacity toner C320 və C325 üçün DMO Genuine kartricdir. Tutum 1 800 səh (ISO/IEC 19798); NA/XE ekvivalenti 006R04821. Orijinal Xerox Magenta supplies-dir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  '006R04826': {
    seoTitle: 'Xerox 006R04826 Yellow toner C320/C325',
    seoDescription:
      'Xerox 006R04826: Yellow Standard Capacity toner, 1 800 səh, C320/C325. C325 rəngi üçün orijinal Xerox Genuine, rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Xerox 006R04826 Yellow Standard Capacity toner C320 və C325 üçün DMO Genuine kartricdir. Tutum 1 800 səh (ISO/IEC 19798); NA/XE ekvivalenti 006R04822. Orijinal Xerox Yellow supplies-dir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  '006R04728': {
    seoTitle: 'Xerox 006R04728 qara toner B415',
    seoDescription:
      'Xerox 006R04728: qara Standard Capacity toner, 6 000 səh, VersaLink B415. İş qrupu üçün orijinal Xerox Genuine, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Xerox 006R04728 qara Standard Capacity toner VersaLink B415 (B420 supplies ailəsi) üçün DMO Genuine kartricdir. Tutum 6 000 səh (ISO/IEC 19752); NA/XE ekvivalenti 006R04725. Mənbə qiyməti sorğu əsasında. Orijinal Xerox supplies-dir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  '006R04764': {
    seoTitle: 'Xerox 006R04764 qara HC toner C415',
    seoDescription:
      'Xerox 006R04764: qara High Capacity toner, 10 500 səh, VersaLink C415. Rəngli MFP üçün orijinal Xerox Genuine, rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Xerox 006R04764 qara High Capacity toner VersaLink C415 və C410 (C425 supplies ailəsi) üçün DMO Genuine kartricdir. Tutum 10 500 səh (ISO/IEC 19798); NA/XE ekvivalenti 006R04685. Mənbə qiyməti sorğu əsasında. Orijinal Xerox supplies-dir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  '006R04765': {
    seoTitle: 'Xerox 006R04765 Cyan HC toner C415',
    seoDescription:
      'Xerox 006R04765: Cyan High Capacity toner, 7 000 səh, VersaLink C415. Mavi çalar üçün orijinal Xerox Genuine, rəsmi zəmanət və çatdırılma ilə.',
    pageIntro:
      'Xerox 006R04765 Cyan High Capacity toner VersaLink C415 və C410 üçün DMO Genuine kartricdir. Tutum 7 000 səh (ISO/IEC 19798); NA/XE ekvivalenti 006R04686. Mənbə qiyməti sorğu əsasında. Orijinal Xerox Cyan supplies-dir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  '006R04766': {
    seoTitle: 'Xerox 006R04766 Magenta HC toner C415',
    seoDescription:
      'Xerox 006R04766: Magenta High Capacity toner, 7 000 səh, VersaLink C415. Bənövşəyi çalar üçün orijinal Xerox Genuine, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Xerox 006R04766 Magenta High Capacity toner VersaLink C415 və C410 üçün DMO Genuine kartricdir. Tutum 7 000 səh (ISO/IEC 19798); NA/XE ekvivalenti 006R04687. Mənbə qiyməti sorğu əsasında. Orijinal Xerox Magenta supplies-dir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  '006R04767': {
    seoTitle: 'Xerox 006R04767 Yellow HC toner C415',
    seoDescription:
      'Xerox 006R04767: Yellow High Capacity toner, 7 000 səh, VersaLink C415. Sarı çalar üçün orijinal Xerox Genuine, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Xerox 006R04767 Yellow High Capacity toner VersaLink C415 və C410 üçün DMO Genuine kartricdir. Tutum 7 000 səh (ISO/IEC 19798); NA/XE ekvivalenti 006R04688. Mənbə qiyməti sorğu əsasında. Orijinal Xerox Yellow supplies-dir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
};

function specValue(
  specs: readonly XeroxSeoSpec[],
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
    'rengli-lazer-mfp': 'rəngli lazer MFP',
    'lazer-mfp': 'lazer MFP',
    'lazer-printer': 'lazer printer',
    kartric: 'toner kartrici',
  };
  return bySlug[subcategorySlug] ?? 'printer avadanlığı';
}

function fallbackSeoCopy(input: XeroxSeoInput): XeroxSeoCopy {
  const sku = normalizeXeroxSku(input.sku);
  const kind = kindLabel(input.subcategorySlug);
  const brand = isXeroxCompatibleSupply(sku) ? 'G&G' : 'Xerox';
  const speed = specValue(input.specs, (label) =>
    label.startsWith('çap sürəti'),
  );
  const yieldPages = specValue(input.specs, (label) => label === 'tutum');
  const color = specValue(
    input.specs,
    (label) => label === 'rəng' || label === 'reng',
  );

  const seoTitle = clampSeoText(
    `${brand} ${sku} ${kind}`.replace(/\s+/g, ' ').trim(),
    SEO_TITLE_SOFT_MAX,
  );

  const parts = [
    `${input.title.trim()} (${sku}) — ${brand} ${kind}.`,
    speed ? `Çap sürəti: ${speed}.` : null,
    yieldPages ? `Tutum: ${yieldPages}.` : null,
    color ? `Rəng: ${color}.` : null,
    'Rəsmi zəmanət və çatdırılma.',
  ].filter((part): part is string => part !== null);

  return {
    seoTitle,
    seoDescription: clampSeoText(parts.join(' '), SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(parts.join(' '), 700),
  };
}

export function resolveXeroxProductSeo(input: XeroxSeoInput): XeroxSeoCopy {
  const sku = normalizeXeroxSku(input.sku);
  const crafted = HANDCRAFTED_XEROX_SEO[sku];
  if (crafted === undefined) {
    return fallbackSeoCopy(input);
  }
  return {
    seoTitle: crafted.seoTitle,
    seoDescription: crafted.seoDescription,
    pageIntro: crafted.pageIntro,
  };
}

export function buildXeroxProductDescription(
  pageIntro: string,
  specs: readonly XeroxSeoSpec[],
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

export function listHandcraftedXeroxSkus(): string[] {
  return Object.keys(HANDCRAFTED_XEROX_SEO);
}
