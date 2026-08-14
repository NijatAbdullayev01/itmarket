import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import {
  listHandcraftedDeltaSkus,
  resolveDeltaProductSeo,
} from './delta-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const ACCESSORY_SKUS = new Set([
  'BBU161B107035',
  'BBU201B109035',
  'SCMS100035',
]);

describe('delta-product-seo', () => {
  const skus = listHandcraftedDeltaSkus();
  const copies = skus.map((sku) => ({
    sku,
    ...resolveDeltaProductSeo({
      sku,
      title: `Delta ${sku}`,
      specs: [],
      subcategorySlug: ACCESSORY_SKUS.has(sku)
        ? 'ups-aksesuarlari'
        : 'on-line-ups',
    }),
  }));

  it('covers every handcrafted Delta SKU', () => {
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
      expect(copy.seoTitle).toMatch(/Delta/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });

  it('does not label cards and battery cabinets as UPS units', () => {
    const snmp = resolveDeltaProductSeo({
      sku: 'SCMS100035',
      title: 'Delta Electronics Mini SNMP IPv6 card',
      specs: [],
      subcategorySlug: 'ups-aksesuarlari',
    });
    expect(snmp.seoTitle.toLocaleLowerCase('az')).toContain('kart');
    expect(snmp.seoDescription.toLocaleLowerCase('az')).toContain('şəbəkə');
    expect(snmp.seoDescription.toLocaleLowerCase('az')).not.toMatch(
      /orijinal delta ups/i,
    );

    const ebc = resolveDeltaProductSeo({
      sku: 'BBU161B107035',
      title: 'Delta Electronics RT 5-20kVA 2U EBC',
      specs: [],
      subcategorySlug: 'ups-aksesuarlari',
    });
    expect(ebc.seoTitle.toLocaleLowerCase('az')).toContain('ebc');
    expect(ebc.seoDescription.toLocaleLowerCase('az')).toContain('batareya');
    expect(ebc.seoDescription.toLocaleLowerCase('az')).not.toMatch(
      /orijinal delta ups/i,
    );
  });
});
