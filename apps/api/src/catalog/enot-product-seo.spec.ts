import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import {
  listHandcraftedEnotSkus,
  resolveEnotProductSeo,
} from './enot-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

describe('enot-product-seo', () => {
  const skus = listHandcraftedEnotSkus();
  const copies = skus.map((sku) => ({
    sku,
    ...resolveEnotProductSeo({
      sku,
      title: `ENOT ${sku}`,
      specs: [],
      subcategorySlug: 'ups-batareyalari',
    }),
  }));

  it('covers every handcrafted ENOT SKU', () => {
    expect(skus.length).toBe(4);
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
      expect(copy.seoTitle).toMatch(/ENOT/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
      expect(copy.seoDescription.toLocaleLowerCase('az')).toContain(
        'batareya',
      );
    }
  });

  it('does not label replacement batteries as UPS units', () => {
    const copy = resolveEnotProductSeo({
      sku: 'NP7.0-12',
      title: 'ENOT NP7.0-12 battery 12V 7Ah',
      specs: [],
      subcategorySlug: 'ups-batareyalari',
    });
    expect(copy.seoTitle.toLocaleLowerCase('az')).toContain('batareya');
    expect(copy.seoDescription.toLocaleLowerCase('az')).not.toMatch(
      /orijinal enot ups(?! batareya)/i,
    );
  });
});
