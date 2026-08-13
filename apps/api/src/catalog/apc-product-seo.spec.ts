import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import {
  listHandcraftedApcSkus,
  resolveApcProductSeo,
} from './apc-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

describe('apc-product-seo', () => {
  const skus = listHandcraftedApcSkus();
  const copies = skus.map((sku) => ({
    sku,
    ...resolveApcProductSeo({
      sku,
      title: `APC ${sku}`,
      specs: [],
      subcategorySlug: sku.startsWith('AP9') ? 'ups-aksesuarlari' : 'line-interactive',
    }),
  }));

  it('covers every handcrafted APC SKU', () => {
    expect(skus.length).toBe(23);
  });

  it('keeps SERP title and meta description within soft limits', () => {
    for (const copy of copies) {
      expect(copy.seoTitle.length).toBeGreaterThan(18);
      expect(copy.seoTitle.length).toBeLessThanOrEqual(SEO_TITLE_SOFT_MAX);
      expect(copy.seoDescription.length).toBeGreaterThanOrEqual(140);
      expect(copy.seoDescription.length).toBeLessThanOrEqual(SEO_DESCRIPTION_SOFT_MAX);
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
      expect(copy.seoTitle).toMatch(/APC/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });

  it('does not label network cards as UPS units', () => {
    const nmc3 = resolveApcProductSeo({
      sku: 'AP9641',
      title: 'UPS Network Management Card 3',
      specs: [],
      subcategorySlug: 'ups-aksesuarlari',
    });
    expect(nmc3.seoTitle.toLocaleLowerCase('az')).toContain('kart');
    expect(nmc3.seoDescription.toLocaleLowerCase('az')).toContain('şəbəkə');
    expect(nmc3.seoDescription.toLocaleLowerCase('az')).not.toMatch(
      /orijinal apc ups/i,
    );
  });
});
