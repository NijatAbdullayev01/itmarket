/**
 * Hand-crafted Transcend catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';
import { normalizeTranscendSku } from './transcend-product-name';

export type TranscendSeoSpec = {
  label: string;
  value: string;
};

export type TranscendSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type TranscendSeoInput = {
  sku: string;
  title: string;
  specs: readonly TranscendSeoSpec[];
  subcategorySlug: string;
};

type TranscendSeoDraft = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

const HANDCRAFTED_TRANSCEND_SEO: Record<string, TranscendSeoDraft> = {
  TS1TESD410C: {
    seoTitle: 'Transcend ESD410C 1TB xarici SSD',
    seoDescription:
      'Transcend ESD410C 1TB: USB 20Gbps portativ SSD, 2000 MB/s, IPX5 və MIL-STD-810G. iPhone ProRes üçün orijinal Transcend, 5 il zəmanət və çatdırılma.',
    pageIntro:
      'Transcend ESD410C (TS1TESD410C) 1 TB portativ xarici SSD-dir. USB 20Gbps (USB 3.2 Gen 2x2) Type-C, SLC Cache və 2000/2000 MB/s oxuma/yazma 4K video və yedəkləmə üçündür. IPX5 su sıçraması, MIL-STD-810G və 3 m düşmə testi; USB-C–USB-C və USB-C–USB-A kabellər dəstdədir. iPhone 15 Pro/Pro Max-də ProRes 4K/60fps birbaşa yazma dəstəklənir. Orijinal Transcend modelidir; 5 il rəsmi zəmanət və çatdırılma ilə.',
  },
  TS2TESD410C: {
    seoTitle: 'Transcend ESD410C 2TB xarici SSD',
    seoDescription:
      'Transcend ESD410C 2TB: USB 20Gbps portativ SSD, 2000 MB/s, IPX5 və 3 m düşmə testi. Böyük arxiv üçün orijinal Transcend, 5 il zəmanət və çatdırılma.',
    pageIntro:
      'Transcend ESD410C (TS2TESD410C) 2 TB portativ xarici SSD-dir. USB 20Gbps Type-C, 3D NAND, SLC Cache və 2000/2000 MB/s sürət böyük foto/video arxivi üçündür. IPX5, MIL-STD-810G və 3 m düşmə qorunması səyahət və çəkiliş dəstlərinə uyğundur; hər iki USB kabel dəstdə gəlir. Dark Blue korpus, kəmər deşiyi və iPhone ProRes dəstəyi ilə orijinal Transcend modelidir; 5 il rəsmi zəmanət və çatdırılma ilə.',
  },
  TS500GESD380C: {
    seoTitle: 'Transcend ESD380C 500GB xarici SSD',
    seoDescription:
      'Transcend ESD380C 500GB: USB 20Gbps portativ SSD, 2000 MB/s və hərbi düşmə testi. Səyahət üçün orijinal Transcend, 5 il zəmanət və çatdırılma.',
    pageIntro:
      'Transcend ESD380C (TS500GESD380C) 500 GB portativ xarici SSD-dir. USB 3.2 Gen 2x2 (20Gbps) Type-C, UASP və 2000/2000 MB/s oxuma/yazma yedəkləmə və 4K material üçündür. Military green silikon rezin korpus MIL-STD-810G 516.6 düşmə testinə cavab verir; USB-C və USB-A kabellər dəstdədir. Orijinal Transcend modelidir; 5 il rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  TS1TESD380C: {
    seoTitle: 'Transcend ESD380C 1TB xarici SSD',
    seoDescription:
      'Transcend ESD380C 1TB: USB 20Gbps portativ SSD, 2000 MB/s və zərbəyə davamlı korpus. Yedəkləmə üçün orijinal Transcend, 5 il zəmanət və çatdırılma.',
    pageIntro:
      'Transcend ESD380C (TS1TESD380C) 1 TB portativ xarici SSD-dir. USB 20Gbps Type-C, UASP və 2000/2000 MB/s sürət noutbuk və telefon yedəkləməsi üçündür. Zərbəyə davamlı military green silikon korpus MIL-STD-810G 516.6 standartına uyğundur; USB-C–USB-C və USB-C–USB-A kabellər daxildir. Windows, macOS, iOS və Android ilə işləyir. Orijinal Transcend modelidir, 5 il rəsmi zəmanət və çatdırılma ilə.',
  },
  TS2TESD380C: {
    seoTitle: 'Transcend ESD380C 2TB xarici SSD',
    seoDescription:
      'Transcend ESD380C 2TB: USB 20Gbps portativ SSD, 2000 MB/s və MIL-STD-810G korpus. Böyük yedək üçün orijinal Transcend, 5 il zəmanət və çatdırılma.',
    pageIntro:
      'Transcend ESD380C (TS2TESD380C) 2 TB portativ xarici SSD-dir. USB 3.2 Gen 2x2 Type-C, 3D NAND və 2000/2000 MB/s oxuma/yazma böyük media arxivi üçündür. Military green silikon rezin korpus hərbi düşmə testindən keçib; hər iki USB kabel dəstdədir. 0°C–60°C iş temperaturu, Windows, macOS, iOS/iPadOS və Android uyğunluğu. Orijinal Transcend modelidir; 5 il rəsmi zəmanət və çatdırılma ilə.',
  },
  TS500GESD265C: {
    seoTitle: 'Transcend ESD265C 500GB xarici SSD',
    seoDescription:
      'Transcend ESD265C 500GB: USB 10Gbps yüngül alüminium SSD, 1050/950 MB/s. Noutbuk və konsol üçün orijinal Transcend, 5 il zəmanət və çatdırılma.',
    pageIntro:
      'Transcend ESD265C (TS500GESD265C) 500 GB portativ xarici SSD-dir. USB 10Gbps Type-C, 1050 MB/s oxuma və 950 MB/s yazma gündəlik yedəkləmə və oyun konsolu üçündür. Yüngül alüminium korpus 81.4 × 33.6 × 7.5 mm, cəmi 31 q; USB-C–USB-C kabel dəstdədir. Iron gray rəng, PC, noutbuk, OTG telefon və konsollarla uyğundur. Orijinal Transcend modelidir, 5 il rəsmi zəmanət və çatdırılma ilə.',
  },
  TS1TESD265C: {
    seoTitle: 'Transcend ESD265C 1TB xarici SSD',
    seoDescription:
      'Transcend ESD265C 1TB: USB 10Gbps yüngül alüminium SSD, 1050/950 MB/s. Noutbuk və cib yaddaşı üçün orijinal Transcend, 5 il zəmanət və çatdırılma.',
    pageIntro:
      'Transcend ESD265C (TS1TESD265C) 1 TB portativ xarici SSD-dir. USB 10Gbps (USB 3.2 Gen 2) Type-C, 1050/950 MB/s sürət və 31 q alüminium korpus cibdə daşımaq üçündür. Iron gray dizayn, USB-C kabel və 0°C–60°C iş temperaturu noutbuk, OTG telefon və oyun konsollarına uyğundur. Orijinal Transcend modelidir; 5 il rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  TS512GESD310C: {
    seoTitle: 'Transcend ESD310C 512GB xarici SSD',
    seoDescription:
      'Transcend ESD310C 512GB: kabel-siz USB-A/C SSD, 1050/900 MB/s və AES-256. Noutbuk və dashcam üçün ən kiçik Transcend, 5 il zəmanət və çatdırılma.',
    pageIntro:
      'Transcend ESD310C (TS512GESD310C) 512 GB kabel-siz portativ SSD-dir. 2-in-1 USB Type-A və Type-C konnektor kabel tələb etmir; SLC Cache ilə 1050/900 MB/s sürət. 71.3 × 20 × 7.8 mm, 11 q — Transcend-in ən kiçik portativ SSD-si. Aparat 256-bit AES, disk kilidi və OTP; EV/Tesla dashcam də daxil Windows, macOS, iOS və Android. Orijinal Transcend modelidir, 5 il rəsmi zəmanət və çatdırılma ilə.',
  },
  TS250GESD270C: {
    seoTitle: 'Transcend ESD270C 250GB xarici SSD',
    seoDescription:
      'Transcend ESD270C 250GB: kredit kartı ölçülü USB 10Gbps SSD, AES-256. Cüzdan və yığcam yedək üçün orijinal Transcend, 3 il zəmanət və çatdırılma.',
    pageIntro:
      'Transcend ESD270C (TS250GESD270C) 250 GB kredit kartı ölçülü portativ SSD-dir. USB 3.1 Gen 2 (10Gbps) Type-C, UASP, 520/460 MB/s oxuma/yazma gündəlik yedəkləmə üçündür. 77 × 55.7 × 9.6 mm, 35 q, cızıqlara davamlı qara örtük. Aparat 256-bit AES, disk kilidi, OTP və One Touch Auto-backup. Orijinal Transcend modelidir; 3 il rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  TS500GESD270C: {
    seoTitle: 'Transcend ESD270C 500GB xarici SSD',
    seoDescription:
      'Transcend ESD270C 500GB: kart ölçülü USB 10Gbps SSD, AES-256 və One Touch yedək. Cüzdan üçün orijinal Transcend, 3 il zəmanət və çatdırılma.',
    pageIntro:
      'Transcend ESD270C (TS500GESD270C) 500 GB kredit kartı ölçülü portativ SSD-dir. USB 10Gbps Type-C, UASP və 520/460 MB/s sürət cüzdanda daşımaq üçündür. Cızıqlara davamlı qara örtük, aparat 256-bit AES şifrələmə, disk kilidi, OTP və One Touch Auto-backup. Windows, macOS, iOS/iPadOS, Linux, ChromeOS və Android. Orijinal Transcend modelidir, 3 il rəsmi zəmanət və çatdırılma ilə.',
  },
  TS1TSJ25M3S: {
    seoTitle: 'Transcend StoreJet 25M3S 1TB xarici HDD',
    seoDescription:
      'Transcend StoreJet 25M3S 1TB: 2.5" USB 5Gbps HDD, MIL-STD-810G və Iron Gray. Yedəkləmə üçün orijinal Transcend, 3 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Transcend StoreJet 25M3S (TS1TSJ25M3S) 1 TB 2.5" portativ xarici HDD-dir. USB 3.1 Gen 1 (5Gbps) micro-USB, üç mərhələli zərbə qorunması və MIL-STD-810G 516.6 düşmə testi səyahət yedəkləməsi üçündür. Iron gray korpus, One Touch Auto-backup və Transcend Elite (AES, disk kilidi). USB konnektor 10 min tax-çıxar testindən keçib. Orijinal Transcend modelidir; 3 il rəsmi zəmanət və çatdırılma ilə.',
  },
  TS1TSJ25M3G: {
    seoTitle: 'Transcend StoreJet 25M3G 1TB xarici HDD',
    seoDescription:
      'Transcend StoreJet 25M3G 1TB: 2.5" USB 5Gbps HDD, hərbi yaşıl korpus və düşmə testi. Yedək üçün orijinal Transcend, 3 il zəmanət və çatdırılma.',
    pageIntro:
      'Transcend StoreJet 25M3G (TS1TSJ25M3G) 1 TB 2.5" portativ xarici HDD-dir. USB 5Gbps, silikon + asqı + möhkəm korpus və MIL-STD-810G düşmə qorunması sərt istifadə üçündür. Military green rəng, One Touch Auto-backup və Transcend Elite şifrələmə. 129.5 × 80.8 × 16.1 mm, 185 q; Windows 7+ və macOS 10.10+. Orijinal Transcend modelidir, 3 il rəsmi zəmanət və çatdırılma ilə.',
  },
  TS2TSJ25M3S: {
    seoTitle: 'Transcend StoreJet 25M3S 2TB xarici HDD',
    seoDescription:
      'Transcend StoreJet 25M3S 2TB: 2.5" USB 5Gbps HDD, üç mərhələli zərbə qorunması. Böyük arxiv üçün orijinal Transcend, 3 il zəmanət və çatdırılma.',
    pageIntro:
      'Transcend StoreJet 25M3S (TS2TSJ25M3S) 2 TB 2.5" portativ xarici HDD-dir. USB 3.1 Gen 1, Iron gray korpus, üç mərhələli zərbə qorunması və MIL-STD-810G 516.6 testi böyük yedək arxivi üçündür. One Touch Auto-backup, Transcend Elite AES şifrələmə və 10 min tax-çıxar USB konnektor. Orijinal Transcend StoreJet modelidir; 3 il rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  TS2TSJ25M3G: {
    seoTitle: 'Transcend StoreJet 25M3G 2TB xarici HDD',
    seoDescription:
      'Transcend StoreJet 25M3G 2TB: 2.5" USB 5Gbps HDD, military green və MIL-STD-810G. Tutumlu yedək üçün orijinal Transcend, 3 il zəmanət və çatdırılma.',
    pageIntro:
      'Transcend StoreJet 25M3G (TS2TSJ25M3G) 2 TB 2.5" portativ xarici HDD-dir. USB 5Gbps micro-USB, military green silikon korpus və hərbi düşmə testi səyahət və ofis yedəkləməsi üçündür. One Touch Auto-backup və Transcend Elite (AES, disk kilidi); 185 q çəki. Windows və macOS ilə işləyir. Orijinal Transcend modelidir, 3 il rəsmi zəmanət və çatdırılma ilə.',
  },
  TS1TSJ25H3B: {
    seoTitle: 'Transcend StoreJet 25H3B 1TB xarici HDD',
    seoDescription:
      'Transcend StoreJet 25H3B 1TB: 2.5" USB 5Gbps HDD, navy blue və anti-slip. RecoveRx bərpa ilə orijinal Transcend, 3 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Transcend StoreJet 25H3B (TS1TSJ25H3B) 1 TB 2.5" portativ xarici HDD-dir. USB 3.1 Gen 1 (5Gbps), üç mərhələli zərbə qorunması, MIL-STD-810G və anti-slip tekstura. Navy blue korpus, One Touch Auto-backup, Transcend Elite və RecoveRx bərpa proqramı. 131.8 × 80.8 × 16.3 mm, 191 q. Orijinal Transcend StoreJet modelidir; 3 il rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
};

function specValue(
  specs: readonly TranscendSeoSpec[],
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

function fallbackSeoCopy(input: TranscendSeoInput): TranscendSeoCopy {
  const sku = normalizeTranscendSku(input.sku);
  const kind =
    input.subcategorySlug === 'xarici-hdd' ? 'xarici HDD' : 'xarici SSD';
  const capacity = specValue(input.specs, (label) => label === 'tutum');

  const seoTitle = clampSeoText(
    input.title.trim() || `Transcend ${sku} ${kind}`,
    SEO_TITLE_SOFT_MAX,
  );

  const parts = [
    `${input.title.trim()} (${sku}) — orijinal Transcend ${kind}.`,
    capacity ? `Tutum: ${capacity}.` : null,
    'Rəsmi zəmanət və çatdırılma.',
  ].filter((part): part is string => part !== null);

  return {
    seoTitle,
    seoDescription: clampSeoText(parts.join(' '), SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(parts.join(' '), 700),
  };
}

export function resolveTranscendProductSeo(
  input: TranscendSeoInput,
): TranscendSeoCopy {
  const sku = normalizeTranscendSku(input.sku);
  const crafted = HANDCRAFTED_TRANSCEND_SEO[sku];
  if (crafted === undefined) {
    return fallbackSeoCopy(input);
  }
  return {
    seoTitle: crafted.seoTitle,
    seoDescription: crafted.seoDescription,
    pageIntro: crafted.pageIntro,
  };
}

export function buildTranscendProductDescription(
  pageIntro: string,
  specs: readonly TranscendSeoSpec[],
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

export function listHandcraftedTranscendSkus(): string[] {
  return Object.keys(HANDCRAFTED_TRANSCEND_SEO);
}
