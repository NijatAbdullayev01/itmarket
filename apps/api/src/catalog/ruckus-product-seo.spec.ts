import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import { resolveRuckusCatalogName } from './ruckus-product-name';
import {
  listHandcraftedRuckusSkus,
  resolveRuckusProductSeo,
} from './ruckus-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const SAMPLES = [
  {
    sku: '901-R350-WW02',
    title: 'R350 ww dual band 11ax indoor AP 2x2:2',
    subcategorySlug: 'access-point',
    specs: [{ label: 'Tip', value: 'Indoor Wi-Fi 6 (802.11ax) Access Point' }],
  },
  {
    sku: '901-R550-WW00',
    title: 'R550-xx 11ax Indoor 2x2:2 AP Plenum',
    subcategorySlug: 'access-point',
    specs: [
      {
        label: 'Tip',
        value: 'Indoor Wi-Fi 6 (802.11ax) Access Point (mid-range / dense)',
      },
    ],
  },
  {
    sku: '901-R770-WW00/demo',
    title: 'R770 Wi-Fi 7 Indoor AP 2x2+4x4+2x2 WW Demo',
    subcategorySlug: 'access-point',
    specs: [
      {
        label: 'Tip',
        value: 'Indoor Wi-Fi 7 (802.11be) Tri-Radio Access Point · Demo SKU',
      },
    ],
  },
] as const;

describe('ruckus-product-seo', () => {
  const copies = SAMPLES.map((sample) => {
    const title = resolveRuckusCatalogName(sample.sku, sample.title, {
      subcategorySlug: sample.subcategorySlug,
      specs: [...sample.specs],
    });
    return {
      sku: sample.sku,
      title,
      ...resolveRuckusProductSeo({
        sku: sample.sku,
        title,
        specs: [...sample.specs],
        subcategorySlug: sample.subcategorySlug,
      }),
    };
  });

  it('covers every Ruckus Excel SKU', () => {
    expect(listHandcraftedRuckusSkus()).toEqual([
      '901-R350-WW02',
      '901-R550-WW00',
      '901-R770-WW00-DEMO',
    ]);
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
      expect(copy.seoTitle).toMatch(/Ruckus/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });
});
