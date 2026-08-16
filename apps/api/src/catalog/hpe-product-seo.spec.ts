import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import {
  listHpeSeoSubcategorySlugs,
  resolveHpeProductSeo,
} from './hpe-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const SAMPLE_BY_SLUG: Record<
  string,
  { sku: string; title: string; specs: Array<{ label: string; value: string }> }
> = {
  'tower-server': {
    sku: 'P22094-421',
    title: 'HPE ProLiant ML350 Gen10',
    specs: [
      {
        label: 'Prosessor',
        value: '1 × Intel Xeon Silver 4208',
      },
      { label: 'Yaddaş', value: '16 GB DDR4-2933 RDIMM' },
    ],
  },
  'rack-server': {
    sku: 'P55280-421',
    title: 'HPE ProLiant DL380 Gen10 Plus',
    specs: [
      {
        label: 'Prosessor',
        value: '1 × Intel Xeon Silver 4314',
      },
      { label: 'Form faktor', value: '2U rack' },
    ],
  },
  prosessor: {
    sku: 'P36933-B21',
    title: 'HPE Intel Xeon Gold 6334',
    specs: [
      { label: 'Nüvə / axın', value: '8 nüvə / 16 axın' },
      { label: 'TDP', value: '165 W' },
    ],
  },
  'server-ram': {
    sku: 'P64706-B21',
    title: 'HPE 32GB DDR5-5600 RDIMM',
    specs: [{ label: 'Tutum', value: '32 GB' }],
  },
  'server-hdd': {
    sku: 'P18432-B21',
    title: 'HPE 4TB SAS 12G 7.2K SFF HDD',
    specs: [
      { label: 'Tutum', value: '4 TB' },
      { label: 'İnterfeys', value: 'SAS 12 Gbps' },
    ],
  },
  'server-ssd': {
    sku: 'P49038-B21',
    title: 'HPE 960GB SAS 12G Mixed Use SFF SSD',
    specs: [
      { label: 'Tutum', value: '960 GB' },
      { label: 'İnterfeys', value: 'SAS 12 Gbps' },
    ],
  },
  'server-sebeke-adapteri': {
    sku: 'P51181-B21',
    title: 'HPE Broadcom BCM5719 1Gb 4-port OCP3 Adapter',
    specs: [{ label: 'Port', value: '4 × 1GBASE-T RJ-45' }],
  },
  'server-sfp-modullar': {
    sku: 'S2P33A',
    title: 'HPE 25G SFP28 SR',
    specs: [
      { label: 'Standart', value: '25GBASE-SR' },
      { label: 'Məsafə', value: '100 m' },
    ],
  },
  'server-aksesuarlari': {
    sku: 'P37042-B21',
    title: 'HPE DL300 Gen10 Plus fan kit',
    specs: [{ label: 'Növ', value: 'Standart sistem fan dəsti (2 fan)' }],
  },
};

describe('hpe-product-seo', () => {
  const slugs = listHpeSeoSubcategorySlugs();
  const copies = slugs.map((subcategorySlug) => {
    const sample = SAMPLE_BY_SLUG[subcategorySlug];
    if (sample === undefined) {
      throw new Error(`Missing HPE SEO sample for ${subcategorySlug}`);
    }
    return {
      sku: sample.sku,
      subcategorySlug,
      ...resolveHpeProductSeo({
        sku: sample.sku,
        title: sample.title,
        specs: sample.specs,
        subcategorySlug,
      }),
    };
  });

  it('covers every HPE subcategory type', () => {
    expect(slugs.length).toBe(Object.keys(SAMPLE_BY_SLUG).length);
    expect(slugs.length).toBe(9);
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
      expect(copy.seoTitle).toMatch(/HPE/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });

  it('does not label rack servers as notebooks', () => {
    const rack = resolveHpeProductSeo({
      sku: 'P55280-421',
      title: 'HPE ProLiant DL380 Gen10 Plus',
      specs: [],
      subcategorySlug: 'rack-server',
    });
    expect(rack.seoTitle.toLocaleLowerCase('az')).toContain('proliant');
    expect(rack.seoDescription.toLocaleLowerCase('az')).toContain('server');
    expect(rack.seoDescription.toLocaleLowerCase('az')).not.toContain(
      'noutbuk',
    );
  });
});
