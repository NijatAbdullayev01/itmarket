import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import { listQnaphddsCatalogNameSkus } from './qnaphdds-product-name';
import {
  listHandcraftedQnaphddsSkus,
  resolveQnaphddsProductSeo,
} from './qnaphdds-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const NAS_SKUS = new Set([
  'ST4000VN006',
  'ST8000VN004',
  'ST16000NT001',
  'ST20000NT001',
]);
const SURVEILLANCE_SKUS = new Set([
  'ST1000VX013',
  'ST6000VX009',
  'ST8000VX010',
  'ST10000VE001',
]);

function subcategoryForSku(sku: string): string {
  if (NAS_SKUS.has(sku)) {
    return 'hdd-nas';
  }
  if (SURVEILLANCE_SKUS.has(sku)) {
    return 'hdd-nezaret';
  }
  return 'server-hdd';
}

describe('qnaphdds-product-seo', () => {
  const skus = listHandcraftedQnaphddsSkus();
  const copies = skus.map((sku) => ({
    sku,
    ...resolveQnaphddsProductSeo({
      sku,
      title: `HDD ${sku}`,
      specs: [],
      subcategorySlug: subcategoryForSku(sku),
    }),
  }));

  it('covers every qnaphdds.xlsx SKU', () => {
    expect(skus).toEqual(listQnaphddsCatalogNameSkus());
    expect(skus.length).toBe(22);
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
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });

  it('does not label NAS or surveillance drives as generic QNAP NAS units', () => {
    const nas = resolveQnaphddsProductSeo({
      sku: 'ST4000VN006',
      title: 'Seagate IronWolf ST4000VN006',
      specs: [],
      subcategorySlug: 'hdd-nas',
    });
    expect(nas.seoTitle).toMatch(/NAS HDD/i);
    expect(nas.seoDescription.toLocaleLowerCase('az')).toContain('nas');

    const nvr = resolveQnaphddsProductSeo({
      sku: 'ST1000VX013',
      title: 'Seagate SkyHawk ST1000VX013',
      specs: [],
      subcategorySlug: 'hdd-nezaret',
    });
    expect(nvr.seoTitle.toLocaleLowerCase('az')).toContain('nəzarət');
    expect(nvr.seoDescription.toLocaleLowerCase('az')).toMatch(/nvr|nəzarət/);

    const server = resolveQnaphddsProductSeo({
      sku: 'ST4000NM024B',
      title: 'Seagate Exos 7E10 ST4000NM024B',
      specs: [],
      subcategorySlug: 'server-hdd',
    });
    expect(server.seoTitle.toLocaleLowerCase('az')).toContain('server');
    expect(server.seoDescription.toLocaleLowerCase('az')).not.toMatch(
      /orijinal qnap nas\b/i,
    );
  });
});
