import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import { listEnGeniusCatalogNameSkus } from './engenius-product-name';
import {
  listHandcraftedEnGeniusSkus,
  resolveEnGeniusProductSeo,
} from './engenius-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const SWITCH_SKUS = new Set([
  'ECS1008P',
  'ECS1112FP',
  'ECS1528P',
  'ECS1528FP',
  'ECS1552P',
  'ECS2552FP',
  'ECS1552FP',
  'ECS5512F',
  'EWS7928P-FIT',
  'EWS7928FP-FIT',
  'EWS7952FP-FIT',
]);

const ACCESS_POINT_SKUS = new Set([
  'ECW120',
  'EWS357-FIT',
  'ECW215',
  'EWS356-FIT',
  'EWS357AP',
  'ECW160',
  'ECW130',
  'ECW220',
  'EWS377-FIT',
  'ENH1350EXT',
  'ECW260',
  'EWS377AP',
  'EWS850-FIT',
  'ECW230',
  'ECW336',
  'ECW220S',
]);

function subcategoryForSku(sku: string): string {
  if (SWITCH_SKUS.has(sku)) {
    return 'kommutator';
  }
  if (ACCESS_POINT_SKUS.has(sku)) {
    return 'access-point';
  }
  if (sku === 'SFP2213-10') {
    return 'sfp-modullar';
  }
  if (sku === 'ESG510') {
    return 'router';
  }
  return 'sebeke-aksesuarlari';
}

describe('engenius-product-seo', () => {
  const skus = listHandcraftedEnGeniusSkus();
  const copies = skus.map((sku) => ({
    sku,
    ...resolveEnGeniusProductSeo({
      sku,
      title: `EnGenius ${sku}`,
      specs: [],
      subcategorySlug: subcategoryForSku(sku),
    }),
  }));

  it('covers every handcrafted EnGenius SKU', () => {
    expect(skus).toEqual(listEnGeniusCatalogNameSkus());
    expect(skus.length).toBe(33);
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
      expect(copy.seoTitle).toMatch(/EnGenius/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });

  it('does not label SFP, gateway or controller as a switch', () => {
    const sfp = resolveEnGeniusProductSeo({
      sku: 'SFP2213-10',
      title: 'EnGenius SFP2213-10',
      specs: [],
      subcategorySlug: 'sfp-modullar',
    });
    expect(sfp.seoTitle.toLocaleLowerCase('az')).toContain('sfp');
    expect(sfp.seoDescription.toLocaleLowerCase('az')).toContain('modul');

    const gateway = resolveEnGeniusProductSeo({
      sku: 'ESG510',
      title: 'EnGenius ESG510',
      specs: [],
      subcategorySlug: 'router',
    });
    expect(gateway.seoTitle.toLocaleLowerCase('az')).toContain('gateway');
    expect(gateway.seoDescription.toLocaleLowerCase('az')).toContain('şlüz');

    const controller = resolveEnGeniusProductSeo({
      sku: 'FITCON100',
      title: 'EnGenius FitController',
      specs: [],
      subcategorySlug: 'sebeke-aksesuarlari',
    });
    expect(controller.seoTitle.toLocaleLowerCase('az')).toContain('idarəetmə');
    expect(controller.seoDescription.toLocaleLowerCase('az')).not.toMatch(
      /orijinal engenius kommutator/i,
    );
  });
});
