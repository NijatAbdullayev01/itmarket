import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import {
  listAddlinkCatalogNameSkus,
  resolveAddlinkCatalogName,
} from './addlink-product-name';
import { resolveAddlinkProductSeo } from './addlink-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

function subcategoryForSku(sku: string): string {
  if (sku.includes('S4UB') || sku.includes('S5UB') || sku.includes('S5US')) {
    return 'gaming-ram';
  }
  if (sku.includes('G55')) {
    return 'gaming-ssd';
  }
  if (sku.includes('B100P')) {
    return 'server-ssd';
  }
  if (sku.includes('P4U') || sku.includes('N4S')) {
    return 'ddr4-ram';
  }
  if (sku.includes('P5U') || sku.includes('N5S')) {
    return 'ddr5-ram';
  }
  if (sku.includes('S20')) {
    return 'ssd';
  }
  if (sku.includes('S90') || sku.includes('S95')) {
    return 'm2-nvme-ssd';
  }
  if (sku.includes('P50')) {
    return 'xarici-ssd';
  }
  return 'yaddas-karti';
}

describe('addlink-product-seo', () => {
  const copies = listAddlinkCatalogNameSkus().map((sku) => {
    const title = resolveAddlinkCatalogName(sku, sku);
    return {
      sku,
      title,
      ...resolveAddlinkProductSeo({
        sku,
        title,
        specs: [],
        subcategorySlug: subcategoryForSku(sku),
      }),
    };
  });

  it('covers every addlink.xlsx SKU', () => {
    expect(copies).toHaveLength(30);
    expect(copies.map((copy) => copy.sku)).toEqual(
      listAddlinkCatalogNameSkus(),
    );
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
      expect(copy.seoTitle).toMatch(/addlink/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });

  it('labels gaming memory and NAS SSDs with the right product kind', () => {
    const spider = resolveAddlinkProductSeo({
      sku: 'AG8GB32C16S4UB',
      title: resolveAddlinkCatalogName('AG8GB32C16S4UB', ''),
      specs: [{ label: 'Tezlik', value: '3200 MT/s' }],
      subcategorySlug: 'gaming-ram',
    });
    expect(spider.seoTitle).toMatch(/Spider/i);
    expect(spider.seoDescription.toLocaleLowerCase('az')).toMatch(
      /oyun ram|ddr4/,
    );

    const nas = resolveAddlinkProductSeo({
      sku: 'AP1920GBB100PM2P',
      title: resolveAddlinkCatalogName('AP1920GBB100PM2P', ''),
      specs: [],
      subcategorySlug: 'server-ssd',
    });
    expect(nas.seoTitle.toLocaleLowerCase('az')).toMatch(/nas|b100p/);
    expect(nas.seoDescription.toLocaleLowerCase('az')).toContain('nas');
  });
});
