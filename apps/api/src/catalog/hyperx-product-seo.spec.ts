import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import { resolveHyperxCatalogName } from './hyperx-product-name';
import { resolveHyperxProductSeo } from './hyperx-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const SAMPLES = [
  {
    sku: '64V61AA',
    title: 'HyperX Armada 25 FHD Gaming Monitor',
    subcategorySlug: 'gaming-monitor',
    specs: [
      { label: 'Tip', value: 'HyperX Armada gaming monitor (IPS, Armada Arm daxil)' },
      { label: 'Diaqonal', value: '24.5"' },
    ],
  },
  {
    sku: '4P5L1AX',
    title: 'HyperX Cloud Alpha (Qara-qırmızı)',
    subcategorySlug: 'gaming-qulaqliq',
    specs: [
      { label: 'Tip', value: 'Naqilli oyun qulaqlığı (Cloud Alpha)' },
      { label: 'Bağlantı', value: '3.5 mm' },
    ],
  },
  {
    sku: '4P5D4AA',
    title: 'HyperX Cloud Alpha - Wireless Gaming Headset (Black-Red)',
    subcategorySlug: 'gaming-qulaqliq',
    specs: [
      { label: 'Tip', value: 'Simsiz oyun qulaqlığı (Cloud Alpha Wireless)' },
      { label: 'Bağlantı', value: '2.4 GHz USB adapter' },
    ],
  },
  {
    sku: '4P5N0AA',
    title: 'HyperX Alloy Origins 60 (HX Red)',
    subcategorySlug: 'gaming-klaviatura',
    specs: [
      { label: 'Tip', value: 'Oyun klaviaturası' },
      { label: 'Forma', value: '60%' },
      { label: 'Switch', value: 'HyperX Red' },
    ],
  },
  {
    sku: '6N0B0AA',
    title: 'HyperX Pulsefire Haste 2 - Wireless Gaming Mouse (Black)',
    subcategorySlug: 'gaming-sican',
    specs: [
      { label: 'Tip', value: 'Simsiz oyun siçanı' },
      { label: 'Sensor / DPI', value: '26000 DPI' },
    ],
  },
  {
    sku: '4P5P8AA',
    title: 'HyperX SoloCast - USB Microphone (Black)',
    subcategorySlug: 'gaming-mikrofon',
    specs: [
      { label: 'Tip', value: 'USB kondensator mikrofon (SoloCast)' },
      { label: 'Bağlantı', value: 'USB' },
    ],
  },
  {
    sku: '4Z7X5AA',
    title: 'HyperX Pulsefire Mat - Gaming Mouse Pad - Cloth (XL)',
    subcategorySlug: 'gaming-sican-altligi',
    specs: [
      { label: 'Tip', value: 'Oyun siçan altlığı' },
      { label: 'Ölçülər', value: '900 × 420 mm' },
    ],
  },
  {
    sku: '8C524AA',
    title: 'HyperX Delta Backpack',
    subcategorySlug: 'gaming-canta',
    specs: [
      { label: 'Tip', value: 'Oyun/noutbuk bel çantası' },
      { label: 'Noutbuk', value: '16.1"' },
    ],
  },
  {
    sku: '75X30AA',
    title: 'HyperX Vision S Webcam',
    subcategorySlug: 'gaming-veb-kamera',
    specs: [
      { label: 'Tip', value: 'HyperX Vision S veb kamera' },
      { label: 'Sensor', value: '8 MP CMOS' },
    ],
  },
  {
    sku: '7D6H2AA',
    title: 'HyperX Clutch Gladiate - Wired Gaming RGB Controller - Xbox',
    subcategorySlug: 'gaming-pult',
    specs: [
      { label: 'Tip', value: 'Naqilli RGB oyun pultu (Clutch Gladiate)' },
      { label: 'Platform', value: 'Xbox Series X|S' },
    ],
  },
  {
    sku: '51P68AA',
    title: 'HyperX ChargePlay Duo - Controller Charging Station for PS5',
    subcategorySlug: 'gaming-sarj-stansiyasi',
    specs: [
      { label: 'Tip', value: 'PS5 DualSense üçün ChargePlay Duo şarj stansiyası' },
      { label: 'Platform', value: 'PlayStation 5' },
    ],
  },
  {
    sku: '73C12AA',
    title: 'HyperX Audio Mixer 20 - 20000 Hz Black',
    subcategorySlug: 'gaming-audio-mikser',
    specs: [
      { label: 'Tip', value: 'USB audio mikser (HyperX Audio Mixer)' },
      { label: 'Tezlik', value: '20–20 000 Hz' },
    ],
  },
] as const;

describe('hyperx-product-seo', () => {
  const copies = SAMPLES.map((sample) => {
    const title = resolveHyperxCatalogName(sample.sku, sample.title, {
      subcategorySlug: sample.subcategorySlug,
      specs: [...sample.specs],
    });
    return {
      sku: sample.sku,
      title,
      ...resolveHyperxProductSeo({
        sku: sample.sku,
        title,
        specs: [...sample.specs],
        subcategorySlug: sample.subcategorySlug,
      }),
    };
  });

  it('keeps SERP title and meta description within soft limits', () => {
    for (const copy of copies) {
      expect(copy.seoTitle.length).toBeGreaterThan(12);
      expect(copy.seoTitle.length).toBeLessThanOrEqual(SEO_TITLE_SOFT_MAX);
      expect(copy.seoDescription.length).toBeGreaterThanOrEqual(140);
      expect(copy.seoDescription.length).toBeLessThanOrEqual(
        SEO_DESCRIPTION_SOFT_MAX,
      );
      expect(copy.pageIntro.length).toBeGreaterThan(180);
    }
  });

  it('writes unique Azerbaijani copy without site suffix or price promises', () => {
    const titles = copies.map((copy) => copy.seoTitle);
    const descriptions = copies.map((copy) => copy.seoDescription);
    const intros = copies.map((copy) => copy.pageIntro);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    expect(new Set(intros).size).toBe(intros.length);

    for (const copy of copies) {
      expect(copy.seoTitle).toMatch(/HyperX/i);
      expect(copy.seoTitle).toContain(copy.sku);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });
});
