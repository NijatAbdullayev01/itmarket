import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import { resolveArubaCatalogName } from './aruba-product-name';
import { resolveArubaProductSeo } from './aruba-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const SAMPLES = [
  {
    sku: 'R8R44A',
    title: 'HPE Instant On 1430 5G Switch',
    subcategorySlug: 'kommutator',
    specs: [
      {
        label: 'Tip',
        value: 'İdarə olunmayan Layer 2 Gigabit kommutator (HPE Instant On 1430)',
      },
      { label: 'Portlar', value: '5 × 10/100/1000BASE-T' },
    ],
  },
  {
    sku: 'JL683A',
    title: 'HPE Instant On 1930 24G 4SFP+ Class4 PoE 195W Switch',
    subcategorySlug: 'kommutator',
    specs: [
      {
        label: 'Tip',
        value: 'Smart/Cloud idarə olunan Layer 2/L3 Gigabit kommutator',
      },
      { label: 'PoE', value: 'Class 4 PoE, 195 W' },
    ],
  },
  {
    sku: 'R4W02A',
    title: 'HPE Instant On AP22 (RW) Wi-Fi 6 2×2 Indoor AP',
    subcategorySlug: 'access-point',
    specs: [
      { label: 'Tip', value: 'Indoor Wi-Fi 6 (802.11ax) access point' },
      { label: 'Wi-Fi', value: 'Wi-Fi 6 2×2' },
    ],
  },
  {
    sku: 'R9D16A',
    title: 'HPE Instant On 1G SFP LC SX 500m MMF Transceiver',
    subcategorySlug: 'sfp-modullar',
    specs: [{ label: 'Tip', value: '1G SFP optik transceiver, Instant On' }],
  },
  {
    sku: 'J9281D',
    title: 'Aruba 10G SFP+ to SFP+ 1m DAC Cable',
    subcategorySlug: 'sebeke-aksesuarlari',
    specs: [
      { label: 'Tip', value: '10G SFP+ DAC (direct attach copper)' },
      { label: 'Uzunluq', value: '1 m' },
    ],
  },
  {
    sku: 'S0G33A',
    title: 'HPE Instant On SG1004 4p Gigabit Secure Gateway',
    subcategorySlug: 'router',
    specs: [{ label: 'Tip', value: 'Instant On Secure Gateway SG1004' }],
  },
] as const;

describe('aruba-product-seo', () => {
  const copies = SAMPLES.map((sample) => {
    const title = resolveArubaCatalogName(sample.sku, sample.title, {
      subcategorySlug: sample.subcategorySlug,
      specs: [...sample.specs],
    });
    return {
      sku: sample.sku,
      title,
      ...resolveArubaProductSeo({
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
      expect(copy.seoTitle).toMatch(/Aruba/i);
      expect(copy.seoTitle).toContain(copy.sku);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });
});
