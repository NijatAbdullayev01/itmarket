import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import { resolveH3cCatalogName } from './h3c-product-name';
import { resolveH3cProductSeo } from './h3c-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const SAMPLES = [
  {
    sku: '9801A3JX',
    title: 'H3C MSR810-LM-EA Enterprise 4G LTE Router',
    subcategorySlug: 'router',
    specs: [
      { label: 'Tip', value: 'Enterprise Gigabit Ethernet + 4G LTE router' },
      { label: 'Model', value: 'MSR810-LM-EA' },
    ],
  },
  {
    sku: '9801A5ND',
    title: 'H3C WA6020 Wi-Fi 6 Access Point',
    subcategorySlug: 'access-point',
    specs: [
      { label: 'Tip', value: 'Wi-Fi Access Point (WLAN AP)' },
      { label: 'Model', value: 'WA6020' },
    ],
  },
  {
    sku: '9801A67U',
    title: 'H3C S1600V2-18P-HPWR 16-port PoE+ kommutator',
    subcategorySlug: 'kommutator',
    specs: [
      { label: 'Portlar', value: '16 × 10/100/1000BASE-T PoE+' },
      { label: 'PoE', value: 'PoE+' },
    ],
  },
  {
    sku: 'SFP-GE-SX-MM850-A',
    title: 'H3C SFP-GE-SX-MM850-A SFP modul',
    subcategorySlug: 'sfp-modullar',
    specs: [{ label: 'Tip', value: '1G SFP optik transceiver' }],
  },
  {
    sku: '0231A7QP',
    title: 'H3C 0231A7QP SFP28 modul',
    subcategorySlug: 'sfp-modullar',
    specs: [{ label: 'Tip', value: '25G SFP28 optik transceiver' }],
  },
  {
    sku: '0231A0AL',
    title: 'H3C 0231A0AL 10G DAC kabel 1.2m',
    subcategorySlug: 'sebeke-aksesuarlari',
    specs: [
      { label: 'Tip', value: 'SFP+ DAC kabel' },
      { label: 'Uzunluq', value: '1.2 m' },
    ],
  },
  {
    sku: 'PSR75-12A-GL',
    title: 'H3C PSR75-12A-GL 75W PSU',
    subcategorySlug: 'sebeke-aksesuarlari',
    specs: [{ label: 'Güc', value: '75 W' }],
  },
] as const;

describe('h3c-product-seo', () => {
  const copies = SAMPLES.map((sample) => {
    const title = resolveH3cCatalogName(sample.sku, sample.title, {
      subcategorySlug: sample.subcategorySlug,
      specs: [...sample.specs],
    });
    return {
      sku: sample.sku,
      title,
      ...resolveH3cProductSeo({
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
      expect(copy.seoTitle).toMatch(/H3C/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });
});
