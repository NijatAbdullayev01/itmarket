import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import {
  listHandcraftedVertivSkus,
  resolveVertivProductSeo,
} from './vertiv-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const ACCESSORY_SKUS = new Set(['LI38000B020', 'RDU101']);

describe('vertiv-product-seo', () => {
  const skus = listHandcraftedVertivSkus();
  const copies = skus.map((sku) => ({
    sku,
    ...resolveVertivProductSeo({
      sku,
      title: `Vertiv ${sku}`,
      specs: [],
      subcategorySlug: ACCESSORY_SKUS.has(sku)
        ? 'ups-aksesuarlari'
        : sku.startsWith('LI32')
          ? 'line-interactive'
          : 'on-line-ups',
    }),
  }));

  it('covers every handcrafted Vertiv SKU', () => {
    expect(skus.length).toBe(6);
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
      expect(copy.seoTitle).toMatch(/Vertiv/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });

  it('does not label network cards as UPS units', () => {
    const snmp = resolveVertivProductSeo({
      sku: 'LI38000B020',
      title: 'UPS Network Management Card LIEBERT GXT-MT+ SNMP card',
      specs: [],
      subcategorySlug: 'ups-aksesuarlari',
    });
    expect(snmp.seoTitle.toLocaleLowerCase('az')).toContain('kart');
    expect(snmp.seoDescription.toLocaleLowerCase('az')).toContain('aksesuar');
    expect(snmp.seoDescription.toLocaleLowerCase('az')).not.toMatch(
      /orijinal vertiv ups(?! aksesuar)/i,
    );

    const rdu = resolveVertivProductSeo({
      sku: 'RDU101',
      title: 'Vertiv Liebert Intellislot RDU101 Communications Card',
      specs: [],
      subcategorySlug: 'ups-aksesuarlari',
    });
    expect(rdu.seoTitle.toLocaleLowerCase('az')).toContain('kart');
    expect(rdu.seoDescription.toLocaleLowerCase('az')).toContain('şəbəkə');
    expect(rdu.seoDescription.toLocaleLowerCase('az')).not.toMatch(
      /orijinal vertiv ups(?! aksesuar)/i,
    );
  });
});
