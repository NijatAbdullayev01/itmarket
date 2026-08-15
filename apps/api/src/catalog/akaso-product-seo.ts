/**
 * Hand-crafted AKASO catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';
import { normalizeAkasoSku } from './akaso-product-name';

export type AkasoSeoSpec = {
  label: string;
  value: string;
};

export type AkasoSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type AkasoSeoInput = {
  sku: string;
  title: string;
  specs: readonly AkasoSeoSpec[];
  subcategorySlug: string;
};

type AkasoSeoDraft = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

const HANDCRAFTED_AKASO_SEO: Record<string, AkasoSeoDraft> = {
  'AKASO360-CREATOR-COMBO': {
    seoTitle: 'AKASO 360 Creator Combo 360° kamera',
    seoDescription:
      'AKASO 360 Creator Combo: 5.7K 360° video, 72MP foto, dual 48MP sensor və 3 batareya. Orijinal AKASO 360° kamera, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'AKASO 360 Creator Combo (AKASO360-CREATOR-COMBO) dual 1/2" 48MP CMOS sensorlu 360° ekşn kameradır. 360° video 5.7K@30 fps-ə qədər, 4K@60 fps və tək linzada 2.8K@60 fps; 72MP 360° foto və DNG8 RAW. 2.29" toxunma ekran, 1350 mAh batareya (~60 dəq 5.7K); dəstdə 3 batareya, şarj qutusu və görünməz selfie çubuğu. 360° Horizon Steady / View Lock Steady, AI obyekt izləmə, Wi-Fi 2.4/5 GHz və AKASO 360 tətbiqi. Hava şəraitinə davamlıdır, suya batırılma rəsmən dəstəklənmir. Orijinal AKASO modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'BRAVE-8-SPORT-COMBO': {
    seoTitle: 'AKASO Brave 8 Sport Combo ekşn kamera',
    seoDescription:
      'AKASO Brave 8 Sport Combo: 4K60 fps, 48MP, SuperSmooth, gövdə 10 m və korpusla 60 m. Orijinal AKASO ekşn kamera, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'AKASO Brave 8 Sport Combo (BRAVE-8-SPORT-COMBO) 1/2" CMOS, 48MP və f/2.5 linzalı ekşn kameradır. 4K60 16:9, 4K30 4:3, 2.7K120, 1080P200, 8K time-lapse və 16x slow-mo; SuperSmooth stabilizasiya. Dual ekran: 2" arxa toxunma + 1.22" ön. Gövdə 10 m suya davamlı, korpusla 60 m. Dəstdə 1550 mAh × 2 batareya, şarj qutusu və pult (~90 dəq 4K). AI Face Metering, səslə idarə (7 dil), Wi-Fi, Bluetooth və AKASO GO. Orijinal AKASO modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'BRAVE-4-PRO-SPORT-COMBO': {
    seoTitle: 'AKASO Brave 4 Pro Sport Combo ekşn kamera',
    seoDescription:
      'AKASO Brave 4 Pro Sport Combo: 4K30 fps, 20MP, EIS 2.0, dual ekran və korpusla 40 m. Orijinal AKASO ekşn kamera, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'AKASO Brave 4 Pro Sport Combo (BRAVE-4-PRO-SPORT-COMBO) 4K30 fps / 20MP ekşn kameradır. Dual ekran (2" arxa toxunma + ön selfie), EIS 2.0 (6 oxlu giroskop), 5x zoom və 170° geniş bucaq. Dəstdəki korpusla 40 m suya davamlıdır; 1350 mAh × 2 batareya (~90 dəq), şarj qutusu, pult və montajlar. MOV H.264/H.265, Wi-Fi, xarici mik və AKASO GO. Orijinal AKASO modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'V50-ELITE': {
    seoTitle: 'AKASO V50 Elite ekşn kamera',
    seoDescription:
      'AKASO V50 Elite: 4K60 fps, 20MP, 2" toxunma ekran, EIS 2.0, Bluetooth pult və korpusla 40 m. Orijinal AKASO ekşn kamera, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'AKASO V50 Elite (V50-ELITE) 4K60 fps / 20MP ekşn kameradır. 2.0" toxunma LCD, EIS 2.0 (6 oxlu giroskop; bəzi yüksək fps rejimlərində sönür), 8x zoom və 170° bucaq. Dəstdəki korpusla 40 m suya davamlıdır; 2 batareya + şarj qutusu (~50 dəq 4K). Səslə idarə, Wi-Fi, Bluetooth pult, Micro HDMI və AKASO DV. Orijinal AKASO modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'BRAVE-4': {
    seoTitle: 'AKASO Brave 4 ekşn kamera',
    seoDescription:
      'AKASO Brave 4: 4K30 fps, 20MP, EIS 2.0, dual ekran, f/1.8 linza, USB-C və korpusla 40 m. Orijinal AKASO ekşn kamera, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'AKASO Brave 4 (BRAVE-4) 4K30 fps / 20MP ekşn kameradır. 2" IPS arxa (toxunmasız) + 0.96" ön status ekranı, EIS 2.0, 5x zoom, f/1.8 və 170°–70° bucaq. Dəstdəki korpusla 40 m suya davamlıdır; 1050 mAh × 2 batareya, şarj qutusu və pult. USB-C, Micro HDMI, Wi-Fi, 2.4G pult və AKASO GO. Orijinal AKASO modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  },
};

function specValue(
  specs: readonly AkasoSeoSpec[],
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
  if (subcategorySlug === '360-kamera') {
    return '360° kamera';
  }
  if (subcategorySlug === 'ekshn-kamera') {
    return 'ekşn kamera';
  }
  return 'AKASO kamera';
}

function fallbackSeoCopy(input: AkasoSeoInput): AkasoSeoCopy {
  const sku = normalizeAkasoSku(input.sku);
  const kind = kindLabel(input.subcategorySlug);
  const video = specValue(input.specs, (label) => label === 'video');
  const title = input.title.trim() || `AKASO ${sku}`;

  const seoTitle = clampSeoText(title, SEO_TITLE_SOFT_MAX);

  const parts = [
    `${title} (${sku}) — orijinal AKASO ${kind}.`,
    video ? `Video: ${video}.` : null,
    'Rəsmi zəmanət və çatdırılma ilə təqdim olunur.',
  ].filter((part): part is string => part !== null);

  return {
    seoTitle,
    seoDescription: clampSeoText(parts.join(' '), SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(parts.join(' '), 700),
  };
}

export function resolveAkasoProductSeo(input: AkasoSeoInput): AkasoSeoCopy {
  const sku = normalizeAkasoSku(input.sku);
  const crafted = HANDCRAFTED_AKASO_SEO[sku];
  if (crafted === undefined) {
    return fallbackSeoCopy(input);
  }
  return {
    seoTitle: crafted.seoTitle,
    seoDescription: crafted.seoDescription,
    pageIntro: crafted.pageIntro,
  };
}

export function buildAkasoProductDescription(
  pageIntro: string,
  specs: readonly AkasoSeoSpec[],
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

export function listHandcraftedAkasoSkus(): string[] {
  return Object.keys(HANDCRAFTED_AKASO_SEO);
}
