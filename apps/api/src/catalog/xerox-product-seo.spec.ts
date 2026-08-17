import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import {
  isXeroxCompatibleSupply,
  listXeroxCatalogNameSkus,
  resolveXeroxCatalogName,
} from './xerox-product-name';
import {
  listHandcraftedXeroxSkus,
  resolveXeroxProductSeo,
} from './xerox-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const SUBCATEGORY_BY_SKU: Record<string, string> = {
  C325V_DNI: 'rengli-lazer-mfp',
  C235V_DNI: 'rengli-lazer-mfp',
  C415V_DN: 'rengli-lazer-mfp',
  B225V_DNI: 'lazer-mfp',
  B235V_DNI: 'lazer-mfp',
  B305V_DNI: 'lazer-mfp',
  B315V_DNI: 'lazer-mfp',
  B415V_DN: 'lazer-mfp',
  '3025V_BI': 'lazer-mfp',
  '3025V_NI': 'lazer-mfp',
  B230V_DNI: 'lazer-printer',
  B310V_DNI: 'lazer-printer',
  '3020V_BI': 'lazer-printer',
};

function subcategoryForSku(sku: string): string {
  return SUBCATEGORY_BY_SKU[sku] ?? 'kartric';
}

describe('xerox-product-seo', () => {
  const skus = listHandcraftedXeroxSkus();
  const copies = skus.map((sku) => {
    const title = resolveXeroxCatalogName(sku, sku);
    return {
      sku,
      title,
      ...resolveXeroxProductSeo({
        sku,
        title,
        specs: [],
        subcategorySlug: subcategoryForSku(sku),
      }),
    };
  });

  it('covers every xerox.xlsx SKU', () => {
    expect(skus).toEqual(listXeroxCatalogNameSkus());
    expect(skus).toHaveLength(29);
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
      if (isXeroxCompatibleSupply(copy.sku)) {
        expect(copy.seoTitle).toMatch(/G&G/i);
        expect(copy.seoDescription).toMatch(/uyğun|compatible|orijinal xerox deyil/i);
      } else {
        expect(copy.seoTitle).toMatch(/Xerox/i);
      }
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });

  it('does not label printers as toner or the G&G clone as Genuine Xerox', () => {
    const printer = resolveXeroxProductSeo({
      sku: 'B230V_DNI',
      title: resolveXeroxCatalogName('B230V_DNI', ''),
      specs: [],
      subcategorySlug: 'lazer-printer',
    });
    expect(printer.seoTitle.toLocaleLowerCase('az')).toContain('printer');
    expect(printer.seoDescription.toLocaleLowerCase('az')).toMatch(/mfp deyil/);
    expect(printer.seoDescription.toLocaleLowerCase('az')).not.toContain(
      'toner',
    );

    const mfp = resolveXeroxProductSeo({
      sku: 'C325V_DNI',
      title: resolveXeroxCatalogName('C325V_DNI', ''),
      specs: [],
      subcategorySlug: 'rengli-lazer-mfp',
    });
    expect(mfp.seoTitle.toLocaleLowerCase('az')).toContain('mfp');
    expect(mfp.seoDescription.toLocaleLowerCase('az')).not.toMatch(/versalink/);

    const clone = resolveXeroxProductSeo({
      sku: 'GG-106R02773',
      title: resolveXeroxCatalogName('GG-106R02773', ''),
      specs: [],
      subcategorySlug: 'kartric',
    });
    expect(clone.seoTitle).toMatch(/G&G/i);
    expect(clone.seoDescription.toLocaleLowerCase('az')).toMatch(
      /orijinal xerox deyil/,
    );
  });
});
