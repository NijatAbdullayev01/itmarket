import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import {
  inferGrandstreamSubcategorySlug,
  resolveGrandstreamCatalogName,
} from './grandstream-product-name';
import { resolveGrandstreamProductSeo } from './grandstream-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const SAMPLE_SKUS = [
  'GCC6010',
  'GWN7062E',
  'GWN7660E',
  'GWN7802P',
  'GRP2612P',
  'GXV3450',
  'DP755',
  'WP816',
  'GAC2570',
  'UCM6301',
  'GUV3000',
  'F-SM1310-10KM-10G',
] as const;

describe('grandstream-product-seo', () => {
  const copies = SAMPLE_SKUS.map((sku) => {
    const subcategorySlug = inferGrandstreamSubcategorySlug(sku);
    const title = resolveGrandstreamCatalogName(sku, sku, { subcategorySlug });
    return {
      sku,
      title,
      ...resolveGrandstreamProductSeo({
        sku,
        title,
        specs: [{ label: 'Tip', value: 'Grandstream şəbəkə avadanlığı' }],
        subcategorySlug,
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
      expect(copy.seoTitle).toMatch(/Grandstream/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });

  it('does not label the DECT base station as a handset', () => {
    const copy = resolveGrandstreamProductSeo({
      sku: 'DP755',
      title: 'Grandstream DP755 IP DECT baza stansiyası',
      specs: [{ label: 'Tip', value: 'DECT VoIP Base Station' }],
      subcategorySlug: 'ip-dect-telefon',
    });
    expect(copy.seoTitle.toLocaleLowerCase('az')).toContain('baza');
    expect(copy.seoDescription.toLocaleLowerCase('az')).toContain('baza');
  });
});
