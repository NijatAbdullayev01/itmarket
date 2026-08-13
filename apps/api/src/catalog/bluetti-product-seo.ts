/**
 * Hand-crafted Bluetti catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';

export type BluettiSeoSpec = {
  label: string;
  value: string;
};

export type BluettiSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type BluettiSeoInput = {
  sku: string;
  title: string;
  specs: readonly BluettiSeoSpec[];
  subcategorySlug: string;
};

type BluettiSeoDraft = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

const HANDCRAFTED_BLUETTI_SEO: Record<string, BluettiSeoDraft> = {
  AC180P: {
    seoTitle: 'Bluetti AC180P 1800W enerji stansiyası',
    seoDescription:
      'Bluetti AC180P: 1.440 Wh LiFePO₄ stansiya, 1.800 W təmiz sinus, USB-C 100 W və UPS. Kamp və ev ehtiyatı üçün orijinal Bluetti, rəsmi 5 il zəmanət.',
    pageIntro:
      'Bluetti AC180P (AC180P) 1.440 Wh LiFePO₄ batareyalı portativ enerji stansiyasıdır. 1.800 W təmiz sinus AC çıxış və Power Lifting Mode ilə 2.700 W qısamüddətli güc noutbuk, mini soyuducu və alətləri qidalandırır. İki Schuko rozetka, USB-C 100 W, dörd USB-A, 15 W simsiz şarj, 500 W günəş girişi və ≤20 ms UPS keçidi ev ehtiyatı, kamp və səyahət üçündür. Turbo AC doldurma, BLUETTI App və 5 il rəsmi zəmanətlə orijinal Bluetti modelidir.',
  },
  AC200PL: {
    seoTitle: 'Bluetti AC200PL 2400W genişlənən stansiya',
    seoDescription:
      'Bluetti AC200PL: 2.304 Wh LiFePO₄, 2.400 W təmiz sinus, B210P genişlənmə və 1.200 W günəş. Ev və kamp üçün orijinal Bluetti, rəsmi 5 il zəmanətlə.',
    pageIntro:
      'Bluetti AC200PL (AC200PL) 2.304 Wh LiFePO₄ tutumlu, genişlənə bilən enerji stansiyasıdır. 2.400 W təmiz sinus və Power Lifting Mode ilə 3.600 W daha ağır ev və kamp yükünü çəkir. Dörd Schuko, cüt USB-C 100 W, 48 V DC və 1.200 W günəş girişi var; B210P, B230 və B300 paketləri ilə tutum artırılır. Wi-Fi və Bluetooth App, ≤20 ms UPS keçidi və 5 il zəmanətlə orijinal Bluetti həllidir.',
  },
  AC2P: {
    seoTitle: 'Bluetti AC2P 300W kompakt stansiya',
    seoDescription:
      'Bluetti AC2P: 230,4 Wh LiFePO₄ mini stansiya, 300 W təmiz sinus, USB-C 100 W və pass-through. Səyahət üçün orijinal Bluetti, rəsmi 5 il zəmanətlə.',
    pageIntro:
      'Bluetti AC2P (AC2P) 230,4 Wh LiFePO₄ mini enerji stansiyasıdır — təxminən 3,6 kq və 300 W təmiz sinus çıxış. Power Lifting Mode rezistiv yüklərdə 600 W-ə qədər imkan verir. Bir Schuko, USB-C 100 W, iki USB-A, 12 V siqaret alışqanı, 200 W günəş girişi və pass-through şarj səyahət, ofis və kiçik elektronika üçündür. Bluetooth App, ≤20 ms UPS və 5 il rəsmi zəmanətlə orijinal Bluetti-dir.',
  },
  AC50P: {
    seoTitle: 'Bluetti AC50P 700W enerji stansiyası',
    seoDescription:
      'Bluetti AC50P: 504 Wh LiFePO₄, 700 W təmiz sinus, cüt USB-C və 15 W simsiz şarj. Kiçik kamp üçün orijinal Bluetti, rəsmi 5 il zəmanət və çatdırılma.',
    pageIntro:
      'Bluetti AC50P (AC50P) 504 Wh LiFePO₄ batareyalı 700 W portativ stansiyadır. Power Lifting Mode rezistiv yüklərdə 1.200 W-ə qədər çıxır. Cüt USB-C, USB-A, 12 V DC, 15 W simsiz şarj və 200 W günəş girişi telefon, noutbuk və kiçik soyuducunu qidalandırır. Təxminən 6,9 kq korpus, ≤20 ms UPS keçidi və 5 il zəmanətlə orijinal Bluetti modelidir.',
  },
  AC70P: {
    seoTitle: 'Bluetti AC70P 1000W enerji stansiyası',
    seoDescription:
      'Bluetti AC70P: 864 Wh LiFePO₄, 1.000 W təmiz sinus, 500 W günəş və Bluetooth App. Kamp və ev üçün orijinal Bluetti, rəsmi 5 il zəmanət və çatdırılma.',
    pageIntro:
      'Bluetti AC70P (AC70P) 864 Wh LiFePO₄ və 1.000 W təmiz sinus çıxışlı enerji stansiyasıdır. Power Lifting Mode 2.000 W, iki AC rozetka, cüt USB-C, USB-A, simsiz şarj və 500 W günəş girişi kamp və ev ehtiyatı üçün nəzərdə tutulub. 10,7 kq korpus, Bluetooth App, ≤20 ms UPS keçidi və 5 il rəsmi zəmanətlə orijinal Bluetti-dir.',
  },
  MP200: {
    seoTitle: 'Bluetti MP200 200W günəş paneli',
    seoDescription:
      'Bluetti MP200: 200 W monokristal günəş paneli, 24% səmərəlilik, ETFE, IP67 və MC4. Portativ stansiya üçün orijinal Bluetti qatlanan günəş paneli.',
    pageIntro:
      'Bluetti MP200 (MP200) 200 W monokristal qatlanan günəş panelidir. 24% hüceyrə səmərəliliyi, ETFE laminasiya, IP67 və standart MC4 konnektor portativ stansiyaları sahədə doldurmaq üçündür. Açıq ölçüsü 2.075 × 681 mm, yığılmış halda təxminən 8,7 kq-dır; Voc 22,9 V və Isc 11 A. Kamp və avtonom enerji üçün orijinal Bluetti günəş panelidir.',
  },
  PV120: {
    seoTitle: 'Bluetti PV120 120W günəş paneli',
    seoDescription:
      'Bluetti PV120: 120 W dördqatlanan monokristal panel, 23,4% səmərəlilik, ETFE və MC4. Stansiya doldurmaq üçün orijinal Bluetti, rəsmi 12 ay zəmanət.',
    pageIntro:
      'Bluetti PV120 (PV120) 120 W dördqatlanan monokristal günəş panelidir. 23,4%-ə qədər səmərəlilik, ETFE, Vmp 19,6 V və MC4 konnektor kiçik-orta stansiyaları doldurur. Açıq ölçü 533 × 1.652 mm, yığılmış çəki 5,7 kq; Voc 24,4 V və Isc 6,43 A. 12 ay rəsmi zəmanətlə orijinal Bluetti panelidir.',
  },
  PV350: {
    seoTitle: 'Bluetti PV350 350W günəş paneli',
    seoDescription:
      'Bluetti PV350: 350 W dördqatlanan monokristal günəş paneli, Voc 46,5 V və MC4. Böyük enerji stansiyası üçün orijinal Bluetti, rəsmi 12 ay zəmanət.',
    pageIntro:
      'Bluetti PV350 (PV350) 350 W dördqatlanan monokristal günəş panelidir. 23,4%-ə qədər səmərəlilik, Vmp 37,5 V, Voc 46,5 V və MC4 daha böyük stansiyalar üçündür. Açıq ölçü 2.400 × 905 mm, yığılmış çəki 13,9 kq. ETFE laminasiya və 12 ay rəsmi zəmanətlə orijinal Bluetti günəş panelidir.',
  },
};

function specValue(
  specs: readonly BluettiSeoSpec[],
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

function fallbackSeoCopy(input: BluettiSeoInput): BluettiSeoCopy {
  const isPanel = input.subcategorySlug === 'gunes-paneli';
  const sku = input.sku.trim().toUpperCase();
  const productType = isPanel
    ? 'orijinal Bluetti günəş paneli'
    : 'orijinal Bluetti enerji stansiyası';
  const capacity = specValue(input.specs, (label) => label === 'kapasitet');
  const acPower = specValue(
    input.specs,
    (label) => label.includes('ac çıxış') || label === 'maksimum güc (pm)',
  );

  const seoTitle = clampSeoText(
    `Bluetti ${sku}`.replace(/\s+/g, ' ').trim(),
    SEO_TITLE_SOFT_MAX,
  );

  const parts = [
    `${input.title.trim()} (${sku}) — ${productType}.`,
    capacity ? `Kapasitet: ${capacity}.` : null,
    acPower ? `Güc: ${acPower}.` : null,
    'Rəsmi zəmanət və çatdırılma.',
  ].filter((part): part is string => part !== null);

  return {
    seoTitle,
    seoDescription: clampSeoText(parts.join(' '), SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(parts.join(' '), 700),
  };
}

export function resolveBluettiProductSeo(
  input: BluettiSeoInput,
): BluettiSeoCopy {
  const sku = input.sku.trim().toUpperCase();
  const crafted = HANDCRAFTED_BLUETTI_SEO[sku];
  if (crafted === undefined) {
    return fallbackSeoCopy(input);
  }
  return {
    seoTitle: crafted.seoTitle,
    seoDescription: crafted.seoDescription,
    pageIntro: crafted.pageIntro,
  };
}

export function buildBluettiProductDescription(
  pageIntro: string,
  specs: readonly BluettiSeoSpec[],
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

export function listHandcraftedBluettiSkus(): string[] {
  return Object.keys(HANDCRAFTED_BLUETTI_SEO);
}
