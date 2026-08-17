import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import {
  listApacerCatalogNameSkus,
  resolveApacerCatalogName,
} from './apacer-product-name';
import { resolveApacerProductSeo } from './apacer-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

function subcategoryForSku(sku: string): string {
  if (
    sku === 'AP512GAS2280Q4U5-1' ||
    sku === 'AP2TBAS2280Q4U5-1' ||
    sku === 'AS2280Q4U-1TB-PS5'
  ) {
    return 'gaming-ssd';
  }
  if (sku === 'AP1TBAS2280Q4U5-1') {
    return 'm2-nvme-ssd';
  }
  if (sku === 'AS16GGB32CSYBGH') {
    return 'ddr4-ram';
  }
  if (sku.includes('AS725') || sku.includes('AS723')) {
    return 'xarici-ssd';
  }
  if (sku.includes('AC2') || sku.includes('AC5') || sku.includes('AC6') || sku.includes('AC7')) {
    return 'xarici-hdd';
  }
  return 'usb-flash';
}

describe('apacer-product-seo', () => {
  const copies = listApacerCatalogNameSkus().map((sku) => {
    const title = resolveApacerCatalogName(sku, sku);
    return {
      sku,
      title,
      ...resolveApacerProductSeo({
        sku,
        title,
        specs: [],
        subcategorySlug: subcategoryForSku(sku),
      }),
    };
  });

  it('covers every apacer.xlsx identity SKU', () => {
    expect(copies).toHaveLength(42);
    expect(copies.map((copy) => copy.sku)).toEqual(
      listApacerCatalogNameSkus(),
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
      expect(copy.pageIntro.length).toBeGreaterThan(120);
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
      expect(copy.seoTitle).toMatch(/Apacer/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });

  it('labels PS5 and portable storage with the right product kind', () => {
    const ps5 = resolveApacerProductSeo({
      sku: 'AP512GAS2280Q4U5-1',
      title: resolveApacerCatalogName('AP512GAS2280Q4U5-1', ''),
      specs: [],
      subcategorySlug: 'gaming-ssd',
    });
    expect(ps5.seoDescription).toMatch(/oyun NVMe SSD/i);
    expect(ps5.pageIntro).toMatch(/PS5/i);

    const hdd = resolveApacerProductSeo({
      sku: 'AP1TBAC237B-1',
      title: resolveApacerCatalogName('AP1TBAC237B-1', ''),
      specs: [{ label: 'Tutum', value: '1TB' }],
      subcategorySlug: 'xarici-hdd',
    });
    expect(hdd.seoDescription).toMatch(/xarici HDD/i);
  });
});
