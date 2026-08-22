import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import { listQnapCatalogNameSkus } from './qnap-product-name';
import {
  listHandcraftedQnapSkus,
  resolveQnapProductSeo,
} from './qnap-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const SWITCH_SKUS = new Set(['QSW-1105-5T', 'QSW-1108-8T', 'QSW-M2106-4C']);
const ADAPTER_SKUS = new Set([
  'TRX-10GITSFPP-SR',
  'TRX-25GSFP28-SR',
  'QXG-10G1T',
  'QXG-25G2SF-E810',
  'QXG-2G2T-I225',
  'QXG-10G2SF-X710',
  'QNA-UC10G1T',
]);
const ACCESSORY_SKUS = new Set([
  'RAIL-A02-90',
  'RAIL-B02',
  'TR-002',
  'TR-004',
  'QM2-2P-244A',
  'QM2-2P-344A',
  'QM2-2P-384A',
]);

function subcategoryForSku(sku: string): string {
  if (SWITCH_SKUS.has(sku)) {
    return 'kommutator';
  }
  if (ADAPTER_SKUS.has(sku)) {
    return 'sebeke-adapteri';
  }
  if (ACCESSORY_SKUS.has(sku)) {
    return 'nas-aksesuarlari';
  }
  if (/^[0-9]{7}/.test(sku) || sku === 'ST8000VN004') {
    return 'hdd';
  }
  return 'nas';
}

describe('qnap-product-seo', () => {
  const skus = listHandcraftedQnapSkus();
  const copies = skus.map((sku) => ({
    sku,
    ...resolveQnapProductSeo({
      sku,
      title: `QNAP ${sku}`,
      specs: [],
      subcategorySlug: subcategoryForSku(sku),
    }),
  }));

  it('covers every QNAP Excel SKU', () => {
    expect(skus).toEqual(listQnapCatalogNameSkus());
    expect(skus.length).toBe(57);
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
      expect(copy.seoTitle).toMatch(/QNAP/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });

  it('does not label switches, adapters or rails as NAS units', () => {
    const switchCopy = resolveQnapProductSeo({
      sku: 'QSW-1105-5T',
      title: 'QNAP QSW-1105-5T',
      specs: [],
      subcategorySlug: 'kommutator',
    });
    expect(switchCopy.seoTitle.toLocaleLowerCase('az')).toContain('kommutator');
    expect(switchCopy.seoDescription.toLocaleLowerCase('az')).toContain(
      'kommutator',
    );

    const adapter = resolveQnapProductSeo({
      sku: 'QXG-10G2SF-X710',
      title: 'QNAP QXG-10G2SF-X710',
      specs: [],
      subcategorySlug: 'sebeke-adapteri',
    });
    expect(adapter.seoTitle.toLocaleLowerCase('az')).toContain('adapter');
    expect(adapter.seoDescription.toLocaleLowerCase('az')).not.toMatch(
      /orijinal qnap nas\b/i,
    );

    const rail = resolveQnapProductSeo({
      sku: 'RAIL-B02',
      title: 'QNAP RAIL-B02',
      specs: [],
      subcategorySlug: 'nas-aksesuarlari',
    });
    expect(rail.seoTitle.toLocaleLowerCase('az')).toContain('rels');
    expect(rail.seoDescription.toLocaleLowerCase('az')).toContain('aksesuar');
  });
});
