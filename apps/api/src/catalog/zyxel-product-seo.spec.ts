import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import { listZyxelCatalogNameSkus } from './zyxel-product-name';
import {
  listHandcraftedZyxelSkus,
  resolveZyxelProductSeo,
} from './zyxel-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const SUBCATEGORY_BY_SKU: Record<string, string> = {
  GS1008HP: 'kommutator',
  'GS1100-10HP': 'kommutator',
  'GS1100-16': 'kommutator',
  'GS1100-24E': 'kommutator',
  'GS1900-48': 'kommutator',
  'GS1900-48HPV2': 'kommutator',
  'GS1920-24HPV2': 'kommutator',
  'GS1920-48HPV2': 'kommutator',
  'XGS1935-28': 'kommutator',
  'XGS1935-52': 'kommutator',
  'GS2220-10': 'kommutator',
  'GS2220-28HP': 'kommutator',
  NWA50AX: 'access-point',
  NWA55AXE: 'access-point',
  WAX300H: 'access-point',
};

describe('zyxel-product-seo', () => {
  const skus = listHandcraftedZyxelSkus();
  const copies = skus.map((sku) => ({
    sku,
    ...resolveZyxelProductSeo({
      sku,
      title: `Zyxel ${sku}`,
      specs: [],
      subcategorySlug: SUBCATEGORY_BY_SKU[sku] ?? 'kommutator',
    }),
  }));

  it('covers every Zyxel Excel SKU', () => {
    expect(skus).toEqual(listZyxelCatalogNameSkus());
    expect(skus.length).toBe(15);
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
      expect(copy.seoTitle).toMatch(/Zyxel/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });
});
