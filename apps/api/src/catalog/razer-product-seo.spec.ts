import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import {
  listRazerCatalogNameSkus,
  resolveRazerCatalogName,
} from './razer-product-name';
import { resolveRazerProductSeo } from './razer-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

function subcategoryForSku(sku: string): string {
  if (sku.startsWith('RZ04-')) {
    return 'gaming-qulaqliq';
  }
  if (sku.startsWith('RZ05-')) {
    return 'gaming-dinamik';
  }
  if (sku.startsWith('RZ03-')) {
    return 'gaming-klaviatura';
  }
  if (sku.startsWith('RZ01-')) {
    return 'gaming-sican';
  }
  if (sku.startsWith('RZ02-')) {
    return 'gaming-sican-altligi';
  }
  if (sku.startsWith('RC81-')) {
    return 'gaming-canta';
  }
  if (sku.startsWith('RZ38-')) {
    return 'gaming-kreslo';
  }
  if (sku.startsWith('RZ19-')) {
    return 'gaming-mikrofon';
  }
  return 'gaming-pult';
}

describe('razer-product-seo', () => {
  const copies = listRazerCatalogNameSkus().map((sku) => {
    const title = resolveRazerCatalogName(sku, sku);
    return {
      sku,
      title,
      ...resolveRazerProductSeo({
        sku,
        title,
        specs: [],
        subcategorySlug: subcategoryForSku(sku),
      }),
    };
  });

  it('covers every razer.xlsx SKU', () => {
    expect(copies).toHaveLength(114);
    expect(copies.map((copy) => copy.sku)).toEqual(listRazerCatalogNameSkus());
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
      expect(copy.seoTitle).toMatch(/Razer/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });

  it('labels wireless headsets and chairs with the right product kind', () => {
    const headset = resolveRazerProductSeo({
      sku: 'RZ04-05170100-R3M1',
      title: resolveRazerCatalogName('RZ04-05170100-R3M1', ''),
      specs: [{ label: 'Bağlantı', value: '2.4 GHz / Bluetooth' }],
      subcategorySlug: 'gaming-qulaqliq',
    });
    expect(headset.seoTitle).toMatch(/Kraken V4/i);
    expect(headset.seoDescription.toLocaleLowerCase('az')).toMatch(
      /simsiz oyun qulaqlığı|2\.4 ghz/,
    );

    const chair = resolveRazerProductSeo({
      sku: 'RZ38-04900300-R3G1',
      title: resolveRazerCatalogName('RZ38-04900300-R3G1', ''),
      specs: [{ label: 'Üzlük', value: 'parça' }],
      subcategorySlug: 'gaming-kreslo',
    });
    expect(chair.seoTitle.toLocaleLowerCase('az')).toMatch(/iskur|ıskur/);
    expect(chair.seoDescription.toLocaleLowerCase('az')).toContain('kreslo');
  });
});
