import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import {
  listOneScreenCatalogNameSkus,
  resolveOneScreenCatalogName,
} from './onescreen-product-name';
import {
  listHandcraftedOneScreenSkus,
  resolveOneScreenProductSeo,
} from './onescreen-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const SUBCATEGORY_BY_SKU: Record<string, string> = {
  PANEL55: 'interaktiv-lovhe',
  'T7-65': 'interaktiv-lovhe',
  PANEL75: 'interaktiv-lovhe',
  'T7-75': 'interaktiv-lovhe',
  'OS-T7-75': 'interaktiv-lovhe',
  PANEL86: 'interaktiv-lovhe',
  'T7-86': 'interaktiv-lovhe',
  'OS-T7-86': 'interaktiv-lovhe',
  CORE65: 'interaktiv-lovhe',
  CORE75: 'interaktiv-lovhe',
  CORE86: 'interaktiv-lovhe',
  'ONESCREEN-I5-L7': 'mini-pc',
  'ONESCREEN-I7-L7': 'mini-pc',
  'OS-MOBILE-CART': 'monitor-stendi',
  ONESCREENCAST: 'ekran-paylasimi',
  ONESCREENWEBCAM: 'konfrans-kamerasi',
};

describe('onescreen-product-seo', () => {
  const skus = listHandcraftedOneScreenSkus();
  const copies = skus.map((sku) => {
    const title = resolveOneScreenCatalogName(sku, sku);
    return {
      sku,
      title,
      ...resolveOneScreenProductSeo({
        sku,
        title,
        specs: [],
        subcategorySlug: SUBCATEGORY_BY_SKU[sku] ?? 'interaktiv-lovhe',
      }),
    };
  });

  it('covers every onescreen.xlsx SKU', () => {
    expect(skus).toEqual(listOneScreenCatalogNameSkus());
    expect(skus).toHaveLength(16);
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
      expect(copy.seoTitle).toMatch(/OneScreen/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });

  it('labels OPS, cart, Cast and TrackCam with the right product kind', () => {
    const ops = resolveOneScreenProductSeo({
      sku: 'ONESCREEN-I5-L7',
      title: resolveOneScreenCatalogName('ONESCREEN-I5-L7', ''),
      specs: [],
      subcategorySlug: 'mini-pc',
    });
    expect(ops.seoTitle.toLocaleLowerCase('az')).toMatch(/ops/);
    expect(ops.seoDescription.toLocaleLowerCase('az')).toContain('t7');

    const cast = resolveOneScreenProductSeo({
      sku: 'ONESCREENCAST',
      title: resolveOneScreenCatalogName('ONESCREENCAST', ''),
      specs: [],
      subcategorySlug: 'ekran-paylasimi',
    });
    expect(cast.seoTitle.toLocaleLowerCase('az')).toContain('cast');
    expect(cast.seoDescription.toLocaleLowerCase('az')).toMatch(/wi-fi|dongle/);

    const cam = resolveOneScreenProductSeo({
      sku: 'ONESCREENWEBCAM',
      title: resolveOneScreenCatalogName('ONESCREENWEBCAM', ''),
      specs: [],
      subcategorySlug: 'konfrans-kamerasi',
    });
    expect(cam.seoTitle.toLocaleLowerCase('az')).toContain('trackcam');
    expect(cam.seoDescription.toLocaleLowerCase('az')).toMatch(/4k|eptz/);
  });
});
