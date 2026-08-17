import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import { listFortinetCatalogNameSkus } from './fortinet-product-name';
import {
  listHandcraftedFortinetSkus,
  resolveFortinetProductSeo,
} from './fortinet-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const SWITCH_SKUS = new Set([
  'FS-108F',
  'FS-108F-FPOE',
  'FS-108F-POE',
  'FS-110G-FPOE',
  'FS-124F',
  'FS-124F-FPOE',
  'FS-124F-POE',
  'FS-148F',
  'FS-148F-FPOE',
  'FS-148F-POE',
  'FS-224D-FPOE',
  'FS-224E',
  'FS-224E-POE',
  'FS-248E-FPOE',
  'FS-248E-POE',
  'FS-448E-POE',
  'FS-424E',
]);

const FIREWALL_SKUS = new Set([
  'FG-30G',
  'FWF-30G-E',
  'FG-40F',
  'FG-40F-3G4G',
  'FG-50G',
  'FG-50G-SFP',
  'FG-51G',
  'FG-51G-SFP-POE',
  'FG-60F',
  'FG-61F',
  'FG-70G',
  'FG-71G',
  'FG-80F',
  'FG-81F',
  'FG-90G',
  'FG-91G',
  'FG-100F',
  'FG-100F-LENC',
  'FG-101F',
  'FG-120G',
  'FG-121G',
  'FG-121G-LENC',
]);

function subcategoryForSku(sku: string): string {
  if (SWITCH_SKUS.has(sku)) {
    return 'kommutator';
  }
  if (FIREWALL_SKUS.has(sku)) {
    return 'firewall';
  }
  if (sku === 'FON-C71') {
    return 'ip-konfrans-telefonu';
  }
  if (sku.startsWith('FON-')) {
    return 'ip-telefon';
  }
  if (sku.startsWith('FVE-')) {
    return 'ip-pbx';
  }
  if (sku.startsWith('FAP-')) {
    return 'access-point';
  }
  if (sku.startsWith('FN-TRAN')) {
    return 'sfp-modullar';
  }
  if (sku === 'FEX-200F') {
    return 'router';
  }
  return 'sebeke-aksesuarlari';
}

describe('fortinet-product-seo', () => {
  const skus = listHandcraftedFortinetSkus();
  const copies = skus.map((sku) => ({
    sku,
    ...resolveFortinetProductSeo({
      sku,
      title: `Fortinet ${sku}`,
      specs: [],
      subcategorySlug: subcategoryForSku(sku),
    }),
  }));

  it('covers every handcrafted Fortinet SKU', () => {
    expect(skus).toEqual(listFortinetCatalogNameSkus());
    expect(skus.length).toBe(63);
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
      expect(copy.seoTitle).toMatch(/Fortinet/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });

  it('does not label SFP, firewall or phones as a switch', () => {
    const sfp = resolveFortinetProductSeo({
      sku: 'FN-TRAN-LX',
      title: 'Fortinet FN-TRAN-LX',
      specs: [],
      subcategorySlug: 'sfp-modullar',
    });
    expect(sfp.seoTitle.toLocaleLowerCase('az')).toContain('sfp');
    expect(sfp.seoDescription.toLocaleLowerCase('az')).toContain('modul');
    expect(sfp.seoDescription.toLocaleLowerCase('az')).not.toMatch(
      /orijinal fortiSwitch kommutator/i,
    );

    const firewall = resolveFortinetProductSeo({
      sku: 'FG-30G',
      title: 'Fortinet FortiGate 30G',
      specs: [],
      subcategorySlug: 'firewall',
    });
    expect(firewall.seoTitle.toLocaleLowerCase('az')).toContain('ngfw');
    expect(firewall.seoDescription.toLocaleLowerCase('az')).toContain(
      'firewall',
    );

    const phone = resolveFortinetProductSeo({
      sku: 'FON-380',
      title: 'Fortinet FortiFone 380',
      specs: [],
      subcategorySlug: 'ip-telefon',
    });
    expect(phone.seoTitle.toLocaleLowerCase('az')).toContain('telefon');
    expect(phone.seoDescription.toLocaleLowerCase('az')).toContain('telefon');
  });
});
