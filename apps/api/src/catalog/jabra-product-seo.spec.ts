import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import { resolveJabraCatalogName } from './jabra-product-name';
import { resolveJabraProductSeo } from './jabra-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const SAMPLES = [
  {
    sku: '204151-BOX',
    title: 'BlueParrott C400-XT',
    subcategorySlug: 'qulaqliq',
    specs: [{ label: 'Tip', value: 'Bluetooth headset (BlueParrott / Jabra)' }],
  },
  {
    sku: '1519-0154',
    title: 'Jabra BIZ 1500 Duo, QD, NC, EMEA',
    subcategorySlug: 'qulaqliq',
    specs: [
      { label: 'Tip', value: 'Wired call-center headset' },
      { label: 'Forma', value: 'Duo' },
      { label: 'Bağlantı', value: 'QD' },
    ],
  },
  {
    sku: '26699-999-999',
    title: 'Jabra Evolve2 65 Flex Link380a MS Stereo',
    subcategorySlug: 'qulaqliq',
    specs: [{ label: 'Tip', value: 'Foldable wireless stereo headset' }],
  },
  {
    sku: '20797-999-889',
    title: 'Jabra Evolve2 Buds, USB-C MS - Wireless Charging Pad',
    subcategorySlug: 'qulaqliq',
    specs: [{ label: 'Tip', value: 'True wireless earbuds (UC)' }],
  },
  {
    sku: '14101-45',
    title: 'Foam Ear Cushion, EVOLVE 20-65',
    subcategorySlug: 'qulaqliq-aksesuarlari',
    specs: [{ label: 'Tip', value: 'Ehtiyat foam (köpük) qulaqlıq yastığı' }],
  },
  {
    sku: '230-09',
    title: 'Jabra LINK 230',
    subcategorySlug: 'qulaqliq-aksesuarlari',
    specs: [{ label: 'Tip', value: 'USB adapter / link' }],
  },
  {
    sku: '2755-109',
    title: 'Jabra Speak2 55, MS Teams',
    subcategorySlug: 'konfrans-dinamiki',
    specs: [{ label: 'Tip', value: 'Portable speakerphone' }],
  },
  {
    sku: '8200-231',
    title: 'Jabra PanaCast 50, EMEA, Black',
    subcategorySlug: 'konfrans-kamerasi',
    specs: [
      { label: 'Tip', value: 'Intelligent video bar / conferencing camera' },
    ],
  },
  {
    sku: '8220-209',
    title: 'Jabra PanaCast 50 Remote, Black',
    subcategorySlug: 'konfrans-kamera-aksesuarlari',
    specs: [{ label: 'Tip', value: 'Remote control aksesuarı' }],
  },
  {
    sku: '14202-11',
    title: 'Jabra PanaCast USB Cable, USB 2.0, 5m, USB-C to USB-A',
    subcategorySlug: 'konfrans-kamera-aksesuarlari',
    specs: [{ label: 'Tip', value: 'USB kabel' }, { label: 'Uzunluq', value: '5 m' }],
  },
] as const;

describe('jabra-product-seo', () => {
  const copies = SAMPLES.map((sample) => {
    const title = resolveJabraCatalogName(sample.sku, sample.title, {
      subcategorySlug: sample.subcategorySlug,
      specs: [...sample.specs],
    });
    return {
      sku: sample.sku,
      title,
      ...resolveJabraProductSeo({
        sku: sample.sku,
        title,
        specs: [...sample.specs],
        subcategorySlug: sample.subcategorySlug,
      }),
    };
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
      expect(copy.seoTitle).toMatch(/Jabra/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });
});
