import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import {
  listMirsanCatalogNameSkus,
  resolveMirsanCatalogName,
} from './mirsan-product-name';
import {
  listHandcraftedMirsanSkus,
  resolveMirsanProductSeo,
} from './mirsan-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const SUBCATEGORY_BY_SKU: Record<string, string> = {
  'MR.FAN2WT.01': 'rack-aksesuarlari',
  'MR.WTC12U66MN.02': 'divar-skafi',
  'MR.WTC09U66MN.02': 'divar-skafi',
  'MR.GTN42U61.01_PRF63': 'sebeke-skafi',
  'MR.HD.GTN42U81.01_PRF63': 'sebeke-skafi',
  'MR.GTS42U812.01': 'server-skafi',
  'MR.PRZ1U10O.PRFR.SC': 'pdu',
  'MR.PRZ42U2412D.SC': 'pdu',
  'MR.PRZ42U20XC13-4XC19': 'pdu',
  'MR.PRZ42U20XC13-4XC19.AMP.PDU': 'pdu',
  'MR.PRZ42U2422D.SC': 'pdu',
  'MR.PRZ42U24P.C13': 'pdu',
  'MR.PRZ42U24D.SC': 'pdu',
  'MR.PRZ42U24D.MCB.IE': 'pdu',
};

describe('mirsan-product-seo', () => {
  const skus = listHandcraftedMirsanSkus();
  const copies = skus.map((sku) => {
    const title = resolveMirsanCatalogName(sku, sku);
    return {
      sku,
      title,
      ...resolveMirsanProductSeo({
        sku,
        title,
        specs: [],
        subcategorySlug: SUBCATEGORY_BY_SKU[sku] ?? 'pdu',
      }),
    };
  });

  it('covers every mirsan.xlsx SKU', () => {
    expect(skus).toEqual(listMirsanCatalogNameSkus());
    expect(skus).toHaveLength(14);
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
      expect(copy.seoTitle).toMatch(/Mirsan/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });

  it('labels cabinets and PDUs with the right product kind', () => {
    const wall = resolveMirsanProductSeo({
      sku: 'MR.WTC12U66MN.02',
      title: resolveMirsanCatalogName('MR.WTC12U66MN.02', ''),
      specs: [],
      subcategorySlug: 'divar-skafi',
    });
    expect(wall.seoTitle.toLocaleLowerCase('az')).toMatch(/divar|wtc/);
    expect(wall.seoDescription.toLocaleLowerCase('az')).toContain('divar');

    const pdu = resolveMirsanProductSeo({
      sku: 'MR.PRZ1U10O.PRFR.SC',
      title: resolveMirsanCatalogName('MR.PRZ1U10O.PRFR.SC', ''),
      specs: [],
      subcategorySlug: 'pdu',
    });
    expect(pdu.seoTitle).toMatch(/PDU/);
    expect(pdu.seoDescription.toLocaleLowerCase('az')).toMatch(/schuko|pdu/);
  });
});
