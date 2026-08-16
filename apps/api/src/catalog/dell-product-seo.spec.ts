import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import {
  listDellSeoSubcategorySlugs,
  resolveDellProductSeo,
} from './dell-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const SAMPLE_BY_SLUG: Record<
  string,
  { sku: string; title: string; specs: Array<{ label: string; value: string }> }
> = {
  noutbuk: {
    sku: 'BTO010-PC14250',
    title: 'Dell Pro 14 PC14250 / Core 5 120U',
    specs: [
      { label: 'Prosessor', value: 'Intel Core 5 120U' },
      { label: 'RAM', value: '16 GB' },
      { label: 'Yaddaş', value: '512 GB SSD' },
    ],
  },
  '2-in-1-noutbuk': {
    sku: '210-BPDR',
    title: 'Dell Pro 14 Plus PB14250 / Ultra 5 235U vPro',
    specs: [
      { label: 'Prosessor', value: 'Intel Core Ultra 5 235U vPro' },
      { label: 'RAM', value: '16 GB DDR5' },
      { label: 'Yaddaş', value: '512 GB SSD' },
    ],
  },
  'mobil-workstation': {
    sku: '210-BPVP-U5',
    title: 'Dell Pro Max 14 MC14250 / Ultra 5 235H vPro',
    specs: [
      { label: 'Prosessor', value: 'Intel Core Ultra 5 235H vPro' },
      { label: 'RAM', value: '16 GB DDR5' },
      { label: 'Yaddaş', value: '512 GB SSD' },
    ],
  },
  'enerji-adapteri': {
    sku: '450-BFFL',
    title: 'Dell 65W USB-C AC Adapter (Europe)',
    specs: [{ label: 'Güc', value: '65 W' }],
  },
  'noutbuk-cantasi': {
    sku: '460-BFFY',
    title: 'Dell Pro 14-16 Plus EcoLoop Briefcase CC5626',
    specs: [],
  },
  'noutbuk-aksesuarlari': {
    sku: '470-AFKL',
    title: 'Dell 6-in-1 USB-C Multiport Adapter DA305',
    specs: [],
  },
  monitor: {
    sku: '210-BMFF',
    title: 'Dell 24 Monitor P2425H',
    specs: [
      { label: 'Ekran ölçüsü', value: '23.8"' },
      { label: 'Görüntü imkanı', value: '1920 × 1080' },
    ],
  },
  'usb-c-hub-monitor': {
    sku: '210-BMJB',
    title: 'Dell 24 USB-C Hub Monitor P2425HE',
    specs: [
      { label: 'Ekran ölçüsü', value: '23.8"' },
      { label: 'Panel', value: 'IPS' },
    ],
  },
  'ultra-keskin-monitor': {
    sku: '210-BMDV',
    title: 'Dell UltraSharp U4025QW',
    specs: [
      { label: 'Ekran ölçüsü', value: '39.7"' },
      { label: 'Görüntü imkanı', value: '5120 × 2160' },
    ],
  },
  'ultra-genis-monitor': {
    sku: '210-BQWR',
    title: 'Dell 34 Monitor S3425DW',
    specs: [
      { label: 'Ekran ölçüsü', value: '34"' },
      { label: 'Görüntü imkanı', value: '3440 × 1440' },
    ],
  },
  'gaming-monitor': {
    sku: '210-BQWV',
    title: 'Alienware 27 4K QD-OLED AW2725Q',
    specs: [
      { label: 'Ekran ölçüsü', value: '27"' },
      { label: 'Görüntü imkanı', value: '3840 × 2160' },
    ],
  },
  'gaming-klaviatura': {
    sku: '545-BBFL',
    title: 'Alienware AW920K Tri-Mode',
    specs: [],
  },
  'gaming-sican': {
    sku: '545-BBFB',
    title: 'Alienware AW620M Dark Side of the Moon',
    specs: [],
  },
  'gaming-canta': {
    sku: '460-BFCQ',
    title: 'Alienware 18 Backpack AW7825P',
    specs: [],
  },
  'gaming-qulaqliq': {
    sku: '545-BBFH',
    title: 'Alienware AW520H Dark Side of the Moon',
    specs: [],
  },
  qulaqliq: {
    sku: '520-BBNM',
    title: 'Dell Pro Plus Earbuds EB525',
    specs: [],
  },
  masaustu: {
    sku: '210-BPQJ-I7',
    title: 'Dell Pro Micro QCM1250 / i7-14700T',
    specs: [
      { label: 'Prosessor', value: 'Intel Core i7-14700T' },
      { label: 'RAM', value: '16 GB DDR5' },
      { label: 'Yaddaş', value: '512 GB SSD' },
    ],
  },
  monoblok: {
    sku: '210-BPNV',
    title: 'Dell Pro 24 All-in-One QC24250',
    specs: [
      { label: 'Prosessor', value: 'Intel Core Ultra 7 265' },
      { label: 'RAM', value: '16 GB' },
    ],
  },
  'dok-stansiya': {
    sku: '210-BRFQ',
    title: 'Dell Pro Dock WD25',
    specs: [],
  },
  klaviatura: {
    sku: '580-ADGR',
    title: 'Dell Multimedia Keyboard KB216',
    specs: [],
  },
  sican: {
    sku: '570-AAIR',
    title: 'Dell Optical Mouse MS116',
    specs: [],
  },
  'klaviatura-ve-sican-desti': {
    sku: '580-BBVZ',
    title: 'Dell Pro Compact Silent KM555',
    specs: [],
  },
  'sebeke-adapteri': {
    sku: '470-BCFV',
    title: 'Dell USB-C to 2.5G Ethernet Adapter',
    specs: [],
  },
  'rack-server': {
    sku: '210-BBRU-E-2314',
    title: 'Dell PowerEdge R350',
    specs: [
      { label: 'Prosessor (bu konfiq)', value: 'Intel Xeon E-2314' },
      { label: 'RAM (bu konfiq)', value: '16 GB DDR4 UDIMM ECC' },
      { label: 'Yaddaş (bu konfiq)', value: '1 × 480 GB SATA RI SSD' },
    ],
  },
  prosessor: {
    sku: '338-CBXK',
    title: 'Dell Intel Xeon Silver 4310',
    specs: [
      { label: 'Nüvə / axın', value: '12 nüvə / 24 axın' },
      { label: 'TDP', value: '120 W' },
    ],
  },
  'server-ram': {
    sku: 'AB257576',
    title: 'Dell 16GB 2RX8 DDR4 RDIMM 3200MHz',
    specs: [{ label: 'Tutum', value: '16 GB' }],
  },
  'server-hdd': {
    sku: '161-BBPH',
    title: 'Dell 4TB Hard Drive SAS 12Gbps 7.2K',
    specs: [
      { label: 'Tutum', value: '4 TB' },
      { label: 'İnterfeys', value: 'SAS 12 Gbps' },
    ],
  },
  'server-ssd': {
    sku: '345-BDRK',
    title: 'Dell 960GB SSD SATA RI 6Gbps',
    specs: [
      { label: 'Tutum', value: '960 GB' },
      { label: 'İnterfeys', value: 'SATA 6 Gbps' },
    ],
  },
  'server-sebeke-adapteri': {
    sku: '540-BBVL',
    title: 'Dell Broadcom 57412 Dual Port 10Gb SFP+ PCIe Adapter',
    specs: [{ label: 'Port sayı', value: '2' }],
  },
  'server-sfp-modullar': {
    sku: '407-BCHI',
    title: 'Dell SFP28 SR Optic 25GbE',
    specs: [{ label: 'Sürət', value: '25 GbE' }],
  },
  'server-sebeke-aksesuarlari': {
    sku: '470-AAVG',
    title: 'Dell SFP+ to SFP+ 10GbE Copper Twinax Direct Attach Cable 5 Meter',
    specs: [{ label: 'Uzunluq', value: '5 m' }],
  },
  'server-aksesuarlari': {
    sku: '412-AAYT',
    title: 'Dell Standard Heatsink',
    specs: [{ label: 'Tip', value: 'CPU heatsink' }],
  },
};

describe('dell-product-seo', () => {
  const slugs = listDellSeoSubcategorySlugs();
  const copies = slugs.map((subcategorySlug) => {
    const sample = SAMPLE_BY_SLUG[subcategorySlug];
    if (sample === undefined) {
      throw new Error(`Missing Dell SEO sample for ${subcategorySlug}`);
    }
    return {
      sku: sample.sku,
      subcategorySlug,
      ...resolveDellProductSeo({
        sku: sample.sku,
        title: sample.title,
        specs: sample.specs,
        subcategorySlug,
      }),
    };
  });

  it('covers every Dell subcategory type', () => {
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
      expect(copy.seoTitle).toMatch(/Dell|Alienware/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });

  it('does not label monitors as notebooks', () => {
    const monitor = resolveDellProductSeo({
      sku: '210-BMDV',
      title: 'Dell UltraSharp U4025QW',
      specs: [],
      subcategorySlug: 'ultra-keskin-monitor',
    });
    expect(monitor.seoTitle.toLocaleLowerCase('az')).toContain('ultrasharp');
    expect(monitor.seoDescription.toLocaleLowerCase('az')).toContain('monitor');
    expect(monitor.seoDescription.toLocaleLowerCase('az')).not.toContain(
      'noutbuk',
    );
  });

  it('keeps Alienware gaming copy distinct from office notebooks', () => {
    const gaming = resolveDellProductSeo({
      sku: '210-BQWV',
      title: 'Alienware 27 4K QD-OLED AW2725Q',
      specs: [],
      subcategorySlug: 'gaming-monitor',
    });
    expect(gaming.seoTitle).toMatch(/Alienware/i);
    expect(gaming.seoDescription.toLocaleLowerCase('az')).toContain('gaming');
  });

  it('uses Diaqonal and Həll specs for monitor SERP copy', () => {
    const monitor = resolveDellProductSeo({
      sku: '210-AZGT',
      title: 'Dell SE2422H',
      specs: [
        { label: 'Diaqonal', value: '23.8" VA' },
        { label: 'Həll / tezlik', value: 'Full HD 1920×1080' },
      ],
      subcategorySlug: 'monitor',
    });
    expect(monitor.seoDescription).toContain('23.8"');
    expect(monitor.seoDescription).toContain('1920×1080');
  });
});
