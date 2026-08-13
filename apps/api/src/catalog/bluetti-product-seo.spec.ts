import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import {
  listHandcraftedBluettiSkus,
  resolveBluettiProductSeo,
} from './bluetti-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const PANEL_SKUS = new Set(['MP200', 'PV120', 'PV350']);

describe('bluetti-product-seo', () => {
  const skus = listHandcraftedBluettiSkus();
  const copies = skus.map((sku) => ({
    sku,
    ...resolveBluettiProductSeo({
      sku,
      title: `Bluetti ${sku}`,
      specs: [],
      subcategorySlug: PANEL_SKUS.has(sku)
        ? 'gunes-paneli'
        : 'portativ-enerji-stansiyasi',
    }),
  }));

  it('covers every handcrafted Bluetti SKU', () => {
    expect(skus.length).toBe(8);
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
      expect(copy.seoTitle).toMatch(/Bluetti/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });

  it('does not label solar panels as power stations', () => {
    const panel = resolveBluettiProductSeo({
      sku: 'PV350',
      title: 'Bluetti PV350 Solar Panel 350W',
      specs: [],
      subcategorySlug: 'gunes-paneli',
    });
    expect(panel.seoTitle.toLocaleLowerCase('az')).toContain('panel');
    expect(panel.seoDescription.toLocaleLowerCase('az')).toContain('günəş');
    expect(panel.seoTitle.toLocaleLowerCase('az')).not.toContain('stansiya');
  });
});
