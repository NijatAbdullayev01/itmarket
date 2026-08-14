import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import { resolveUgreenCatalogName } from './ugreen-product-name';
import { resolveUgreenProductSeo } from './ugreen-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const SAMPLES = [
  {
    sku: '25685B',
    title: 'UGREEN Uno RG 65W 3-Port GaN Fast Charger EU',
    subcategorySlug: 'sarj-cihazi',
    specs: [
      { label: 'Tip', value: 'GaN divar adapteri' },
      { label: 'Ümumi güc', value: '65 W' },
    ],
  },
  {
    sku: '25874',
    title: 'UGREEN Nexode Pro 100W 3-Port GaN Fast Charger Set EU',
    subcategorySlug: 'sarj-cihazi',
    specs: [
      { label: 'Seriya', value: 'Nexode Pro' },
      { label: 'Ümumi güc', value: '100 W' },
    ],
  },
  {
    sku: '25188',
    title: 'UGREEN 20000mAh Two-way Fast Charging Power Bank',
    subcategorySlug: 'powerbank',
    specs: [{ label: 'Tutum', value: '20.000 mAh' }],
  },
  {
    sku: '65905',
    title: 'UGREEN USB-C to USB-C 100W PD Fast Charging Retractable Cable',
    subcategorySlug: 'usb-kabel',
    specs: [
      { label: 'Tip', value: 'Yığılan USB-C ↔ USB-C şarj/data kabeli' },
      { label: 'Güc', value: '100 W PD' },
    ],
  },
  {
    sku: '10107',
    title: 'UGREEN HDMI 4K Cable Male to Male Black 2m',
    subcategorySlug: 'hdmi-kabel',
    specs: [
      { label: 'Uzunluq', value: '2 m' },
      { label: 'Çözünürlük', value: '4K' },
    ],
  },
  {
    sku: '35757',
    title:
      'UGREEN HiTune Max5c Hybrid Active Noise-Cancelling Headphones Black',
    subcategorySlug: 'qulaqliq',
    specs: [
      { label: 'Tip', value: 'Over-ear simsiz qulaqlıq' },
      { label: 'Seriya', value: 'HiTune' },
    ],
  },
  {
    sku: '45000',
    title: 'UGREEN 6-in-1 USB-C Hub',
    subcategorySlug: 'dok-stansiya',
    specs: [{ label: 'Tip', value: 'USB-C multifunksional hub' }],
  },
  {
    sku: '45025',
    title: 'UGREEN 3-in-1 Magnetic Wireless Charger EU',
    subcategorySlug: 'simsiz-sarj',
    specs: [{ label: 'Tip', value: '3-in-1 maqnit simsiz şarj stansiyası' }],
  },
  {
    sku: '90545',
    title: 'UGREEN Ergonomic Wireless Mouse 2.4G 4000DPI Silence Design',
    subcategorySlug: 'sican',
    specs: [{ label: 'Tip', value: 'Simsiz ofis siçanı' }],
  },
  {
    sku: '20159',
    title: 'UGREEN Cat 6 U/UTP Rounded Lan Cable Black 1m',
    subcategorySlug: 'sebeke-aksesuarlari',
    specs: [
      { label: 'Tip', value: 'Cat 6 U/UTP LAN kabel' },
      { label: 'Uzunluq', value: '1 m' },
    ],
  },
] as const;

describe('ugreen-product-seo', () => {
  const copies = SAMPLES.map((sample) => {
    const title = resolveUgreenCatalogName(sample.sku, sample.title, {
      subcategorySlug: sample.subcategorySlug,
      specs: [...sample.specs],
    });
    return {
      sku: sample.sku,
      title,
      ...resolveUgreenProductSeo({
        sku: sample.sku,
        title,
        specs: [...sample.specs],
        subcategorySlug: sample.subcategorySlug,
      }),
    };
  });

  it('keeps SERP title and meta description within soft limits', () => {
    for (const copy of copies) {
      expect(copy.seoTitle.length).toBeGreaterThan(18);
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
      expect(copy.seoTitle).toMatch(/UGREEN/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });
});
