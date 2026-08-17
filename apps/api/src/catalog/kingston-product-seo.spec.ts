import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import {
  listKingstonCatalogNameSkus,
  resolveKingstonCatalogName,
} from './kingston-product-name';
import { resolveKingstonProductSeo } from './kingston-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

function subcategoryForSku(sku: string): string {
  if (sku.startsWith('KF5')) {
    return 'gaming-ram';
  }
  if (sku.startsWith('SFYR')) {
    return 'gaming-ssd';
  }
  if (sku.startsWith('SEDC')) {
    return 'server-ssd';
  }
  if (sku.startsWith('KVR32')) {
    return 'ddr4-ram';
  }
  if (sku.startsWith('KVR56')) {
    return 'ddr5-ram';
  }
  if (
    sku.startsWith('SA400') ||
    sku.startsWith('SKC600')
  ) {
    return 'ssd';
  }
  if (sku.startsWith('SNV3') || sku.startsWith('SKC3000')) {
    return 'm2-nvme-ssd';
  }
  if (sku.startsWith('DT')) {
    return 'usb-flash';
  }
  if (sku.startsWith('SDC')) {
    return 'yaddas-karti';
  }
  return 'xarici-ssd';
}

describe('kingston-product-seo', () => {
  const copies = listKingstonCatalogNameSkus().map((sku) => {
    const title = resolveKingstonCatalogName(sku, sku);
    return {
      sku,
      title,
      ...resolveKingstonProductSeo({
        sku,
        title,
        specs: [],
        subcategorySlug: subcategoryForSku(sku),
      }),
    };
  });

  it('covers every kingston.xlsx SKU', () => {
    expect(copies).toHaveLength(81);
    expect(copies.map((copy) => copy.sku)).toEqual(
      listKingstonCatalogNameSkus(),
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
      expect(copy.seoTitle).toMatch(/Kingston/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });

  it('labels gaming memory and NAS SSDs with the right product kind', () => {
    const fury = resolveKingstonProductSeo({
      sku: 'KF588CU42RS-24',
      title: resolveKingstonCatalogName('KF588CU42RS-24', ''),
      specs: [{ label: 'Tezlik', value: '8800 MT/s' }],
      subcategorySlug: 'gaming-ram',
    });
    expect(fury.seoTitle).toMatch(/FURY/i);
    expect(fury.seoDescription.toLocaleLowerCase('az')).toMatch(/oyun ram|ddr5/);

    const nas = resolveKingstonProductSeo({
      sku: 'SEDC600M-480G',
      title: resolveKingstonCatalogName('SEDC600M-480G', ''),
      specs: [],
      subcategorySlug: 'server-ssd',
    });
    expect(nas.seoTitle.toLocaleLowerCase('az')).toMatch(/nas|dc600m/);
    expect(nas.seoDescription.toLocaleLowerCase('az')).toContain('nas');
  });
});
