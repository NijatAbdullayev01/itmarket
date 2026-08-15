import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import { listAkasoCatalogNameSkus } from './akaso-product-name';
import {
  listHandcraftedAkasoSkus,
  resolveAkasoProductSeo,
} from './akaso-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const SUBCATEGORY_BY_SKU: Record<string, string> = {
  'AKASO360-CREATOR-COMBO': '360-kamera',
  'BRAVE-8-SPORT-COMBO': 'ekshn-kamera',
  'BRAVE-4-PRO-SPORT-COMBO': 'ekshn-kamera',
  'V50-ELITE': 'ekshn-kamera',
  'BRAVE-4': 'ekshn-kamera',
};

describe('akaso-product-seo', () => {
  const skus = listHandcraftedAkasoSkus();
  const copies = skus.map((sku) => ({
    sku,
    ...resolveAkasoProductSeo({
      sku,
      title: `AKASO ${sku}`,
      specs: [],
      subcategorySlug: SUBCATEGORY_BY_SKU[sku] ?? 'ekshn-kamera',
    }),
  }));

  it('covers every AKASO Excel SKU', () => {
    expect(skus).toEqual(listAkasoCatalogNameSkus());
    expect(skus.length).toBe(5);
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
      expect(copy.seoTitle).toMatch(/AKASO/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });
});
