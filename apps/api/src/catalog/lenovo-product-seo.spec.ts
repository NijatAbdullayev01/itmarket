import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import {
  listLenovoSeoSubcategorySlugs,
  resolveLenovoProductSeo,
} from './lenovo-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const SAMPLE_BY_SLUG: Record<
  string,
  { sku: string; title: string; specs: Array<{ label: string; value: string }> }
> = {
  noutbuk: {
    sku: '21UY000UFW',
    title: 'Lenovo ThinkBook 14 G9',
    specs: [
      { label: 'Prosessor', value: 'Intel Core 5 210H' },
      { label: 'RAM', value: '8 GB' },
      { label: 'Yaddaş', value: '512 GB SSD' },
    ],
  },
  '2-in-1-noutbuk': {
    sku: '21SQ002RFW',
    title: 'Lenovo ThinkBook 14 2-in-1 G5',
    specs: [
      { label: 'Prosessor', value: 'Intel Core Ultra 5 125U' },
      { label: 'RAM', value: '16 GB' },
      { label: 'Yaddaş', value: '512 GB SSD' },
    ],
  },
  'mobil-workstation': {
    sku: '21QUS5HX00',
    title: 'Lenovo ThinkPad P14s Gen 6',
    specs: [
      { label: 'Prosessor', value: 'Intel Core Ultra 7 155H' },
      { label: 'RAM', value: '32 GB' },
      { label: 'Yaddaş', value: '1 TB SSD' },
    ],
  },
  'enerji-adapteri': {
    sku: '40AWGN65EU',
    title: 'Lenovo GaN Nano 65W Adapter',
    specs: [{ label: 'Batareya / adapter', value: '65 W' }],
  },
  'noutbuk-cantasi': {
    sku: '4X40T84061',
    title: 'Lenovo Casual Topload T210',
    specs: [],
  },
  'noutbuk-aksesuarlari': {
    sku: '4XF1A19885',
    title: 'Lenovo 2-in-1 Laptop Stand',
    specs: [],
  },
  monitor: {
    sku: '63DEKAT3EU',
    title: 'Lenovo ThinkVision S24i-30',
    specs: [{ label: 'Ekran', value: '23.8" FHD' }],
  },
  'usb-c-hub-monitor': {
    sku: '63D7UAT3EU',
    title: 'Lenovo ThinkVision T24mv-30',
    specs: [{ label: 'Ekran', value: '23.8" FHD' }],
  },
  'ultra-keskin-monitor': {
    sku: '64AFGAT2EU',
    title: 'Lenovo ThinkVision T27UD-40',
    specs: [{ label: 'Ekran', value: '27" 4K' }],
  },
  'ultra-genis-monitor': {
    sku: '63D4GAT1EU',
    title: 'Lenovo ThinkVision T34w-30',
    specs: [{ label: 'Ekran', value: '34" WQHD' }],
  },
  monoblok: {
    sku: '12SC0048RU',
    title: 'Lenovo ThinkCentre neo 50a 24 Gen 5',
    specs: [
      { label: 'Prosessor', value: 'Intel Core 5 210H' },
      { label: 'RAM', value: '8 GB DDR5' },
    ],
  },
  'dok-stansiya': {
    sku: '40AY0090EU',
    title: 'Lenovo ThinkPad Universal USB-C Dock',
    specs: [],
  },
  klaviatura: {
    sku: '4Y41R69504',
    title: 'Lenovo 800 Self-Charging Bluetooth Keyboard',
    specs: [],
  },
  sican: {
    sku: '4Y50X88822',
    title: 'Lenovo ThinkPad Bluetooth Silent Mouse',
    specs: [],
  },
  'klaviatura-ve-sican-desti': {
    sku: '4X31S04838',
    title: 'Lenovo Wireless Multi-Mode Pro Combo Keyboard and Mouse 6000',
    specs: [],
  },
  'hdmi-kabel': {
    sku: '0B47070',
    title: 'Lenovo HDMI to HDMI cable',
    specs: [],
  },
  'usb-hub': {
    sku: '4X90X21427',
    title: 'Lenovo USB-C to 4 Port USB-A Hub',
    specs: [],
  },
  'video-adapter': {
    sku: '4X90R61022',
    title: 'Lenovo USB-C to HDMI 2.0b Adapter',
    specs: [],
  },
  powerbank: {
    sku: '40ALLG1WWW',
    title: 'Lenovo Go Wireless Mobile Power Bank',
    specs: [],
  },
  'usb-kabel': {
    sku: '4X90U90619',
    title: 'Lenovo USB-C Cable 1m',
    specs: [],
  },
  'sebeke-adapteri': {
    sku: '4X90S91831',
    title: 'Lenovo USB-C to Ethernet Adapter',
    specs: [],
  },
};

describe('lenovo-product-seo', () => {
  const slugs = listLenovoSeoSubcategorySlugs();
  const copies = slugs.map((subcategorySlug) => {
    const sample = SAMPLE_BY_SLUG[subcategorySlug];
    if (sample === undefined) {
      throw new Error(`Missing Lenovo SEO sample for ${subcategorySlug}`);
    }
    return {
      sku: sample.sku,
      subcategorySlug,
      ...resolveLenovoProductSeo({
        sku: sample.sku,
        title: sample.title,
        specs: sample.specs,
        subcategorySlug,
      }),
    };
  });

  it('covers every Lenovo subcategory type', () => {
    expect(slugs.length).toBe(Object.keys(SAMPLE_BY_SLUG).length);
    expect(slugs.length).toBeGreaterThanOrEqual(20);
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
      expect(copy.seoTitle).toMatch(/Lenovo/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });

  it('does not label monitors as notebooks', () => {
    const monitor = resolveLenovoProductSeo({
      sku: '64AFGAT2EU',
      title: 'Lenovo ThinkVision T27UD-40',
      specs: [],
      subcategorySlug: 'ultra-keskin-monitor',
    });
    expect(monitor.seoTitle.toLocaleLowerCase('az')).toContain('4k');
    expect(monitor.seoDescription.toLocaleLowerCase('az')).toContain('monitor');
    expect(monitor.seoDescription.toLocaleLowerCase('az')).not.toContain(
      'noutbuk',
    );
  });
});
