import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import {
  listHpSeoSubcategorySlugs,
  resolveHpProductSeo,
} from './hp-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const SAMPLE_BY_SLUG: Record<
  string,
  { sku: string; title: string; specs: Array<{ label: string; value: string }> }
> = {
  noutbuk: {
    sku: '8X9C9EA',
    title: 'HP 250 G10',
    specs: [
      { label: 'Prosessor', value: 'Intel Core i5-1335U' },
      { label: 'Operativ yaddaş', value: '8GB DDR4 3200' },
      { label: 'Yaddaş', value: '256GB PCIe NVMe SSD' },
    ],
  },
  '2-in-1-noutbuk': {
    sku: '8A4U9EA',
    title: 'HP EliteBook x360 830 G11',
    specs: [
      { label: 'Prosessor', value: 'Intel Core Ultra 5 125U' },
      { label: 'Operativ yaddaş', value: '16GB' },
      { label: 'Yaddaş', value: '512GB PCIe NVMe SSD' },
    ],
  },
  'mobil-workstation': {
    sku: '8T0U1EA',
    title: 'HP ZBook Power 16 G11',
    specs: [
      { label: 'Prosessor', value: 'Intel Core Ultra 7 155H' },
      { label: 'Operativ yaddaş', value: '32GB DDR5 5600' },
      { label: 'Yaddaş', value: '1TB PCIe NVMe SSD' },
    ],
  },
  'enerji-adapteri': {
    sku: '671R3UT',
    title: 'HP USB-C 65W Laptop Charger',
    specs: [{ label: 'Güc', value: '65 W' }],
  },
  'noutbuk-cantasi': {
    sku: '2Z8P4AA',
    title: 'HP Prelude G2 15.6 Top Load',
    specs: [],
  },
  'noutbuk-aksesuarlari': {
    sku: '50H55AA',
    title: 'HP Universal USB-C Multiport Hub',
    specs: [],
  },
  monitor: {
    sku: '64W18AA',
    title: 'HP P24 G5',
    specs: [{ label: 'Ekran', value: '23.8" FHD' }],
  },
  'ultra-keskin-monitor': {
    sku: '6N4C4AA',
    title: 'HP E27k G5 4K USB-C',
    specs: [{ label: 'Ekran', value: '27" 4K' }],
  },
  'ultra-genis-monitor': {
    sku: '21Y56AA',
    title: 'HP P34hc WQHD USB-C Curved',
    specs: [{ label: 'Ekran', value: '34" WQHD' }],
  },
  qulaqliq: {
    sku: '428K7AA',
    title: 'HP 3.5mm Stereo Headset G2',
    specs: [],
  },
  masaustu: {
    sku: 'BY6U2ET',
    title: 'HP ProDesk 2 Tower G1i',
    specs: [
      { label: 'Prosessor', value: 'Intel Core i5-14400' },
      { label: 'Operativ yaddaş', value: '16GB DDR5' },
      { label: 'Yaddaş', value: '512GB SSD' },
    ],
  },
  monoblok: {
    sku: '938B0EA',
    title: 'HP ProOne 240 G10',
    specs: [
      { label: 'Prosessor', value: 'Intel Core i5-1335U' },
      { label: 'Operativ yaddaş', value: '16GB DDR4' },
    ],
  },
  'dok-stansiya': {
    sku: '5TW10AA',
    title: 'HP USB-C Dock G5',
    specs: [],
  },
  klaviatura: {
    sku: '3L1E7AA',
    title: 'HP 230 Wireless Keyboard',
    specs: [],
  },
  sican: {
    sku: '265A9UT',
    title: 'HP 125 Wired Mouse',
    specs: [],
  },
  'klaviatura-ve-sican-desti': {
    sku: '18H24AA',
    title: 'HP 230 Wireless Mouse and Keyboard Combo',
    specs: [],
  },
  videokart: {
    sku: '5Z7D9AA',
    title: 'HP NVIDIA RTX A2000 12GB',
    specs: [
      { label: 'Yaddaş', value: '12 GB GDDR6' },
      { label: 'Tip', value: 'workstation PCIe qrafik kartı' },
    ],
  },
};

describe('hp-product-seo', () => {
  const slugs = listHpSeoSubcategorySlugs();
  const copies = slugs.map((subcategorySlug) => {
    const sample = SAMPLE_BY_SLUG[subcategorySlug];
    if (sample === undefined) {
      throw new Error(`Missing HP SEO sample for ${subcategorySlug}`);
    }
    return {
      sku: sample.sku,
      subcategorySlug,
      ...resolveHpProductSeo({
        sku: sample.sku,
        title: sample.title,
        specs: sample.specs,
        subcategorySlug,
      }),
    };
  });

  it('covers every HP subcategory type', () => {
    expect(slugs.length).toBe(Object.keys(SAMPLE_BY_SLUG).length);
    expect(slugs.length).toBeGreaterThanOrEqual(16);
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
      expect(copy.seoTitle).toMatch(/HP/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });

  it('does not label monitors as notebooks', () => {
    const monitor = resolveHpProductSeo({
      sku: '6N4C4AA',
      title: 'HP E27k G5 4K USB-C',
      specs: [],
      subcategorySlug: 'ultra-keskin-monitor',
    });
    expect(monitor.seoTitle.toLocaleLowerCase('az')).toContain('4k');
    expect(monitor.seoDescription.toLocaleLowerCase('az')).toContain('monitor');
    expect(monitor.seoDescription.toLocaleLowerCase('az')).not.toContain(
      'noutbuk',
    );
  });

  it('keeps GPU copy distinct from notebooks', () => {
    const gpu = resolveHpProductSeo({
      sku: '5Z7D9AA',
      title: 'HP NVIDIA RTX A2000 12GB',
      specs: [{ label: 'Yaddaş', value: '12 GB GDDR6' }],
      subcategorySlug: 'videokart',
    });
    expect(gpu.seoTitle.toLocaleLowerCase('az')).toContain('videokart');
    expect(gpu.seoDescription.toLocaleLowerCase('az')).toContain('videokart');
    expect(gpu.seoDescription.toLocaleLowerCase('az')).not.toContain('noutbuk');
  });
});
