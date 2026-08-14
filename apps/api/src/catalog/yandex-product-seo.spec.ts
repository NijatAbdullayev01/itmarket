import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from '../seo-ai/seo-heuristic';
import { resolveYandexCatalogName } from './yandex-product-name';
import { resolveYandexProductSeo } from './yandex-product-seo';

const PRICE_PROMISE =
  /(ən\s+ucuz|ən\s+sərfəli\s+qiymət|ucuz\s+qiymət|endirim\s+zəmanəti|0\s*azn)/iu;

const SAMPLES = [
  {
    sku: 'YNDX-00020-BLACK',
    title: 'Yandex Stansiya Mini Plus 10 Vt saatlı ağıllı kolonka, qara',
    subcategorySlug: 'agilli-kolonka',
    specs: [
      { label: 'Tip', value: 'Ağıllı kolonka' },
      { label: 'Seriya', value: 'Yandex Stansiya Mini Plus (Mini 2, saatlı)' },
      { label: 'Səs gücü', value: '10 Vt' },
      { label: 'Saat', value: 'Var' },
      { label: 'Rəng', value: 'qara' },
    ],
  },
  {
    sku: 'YNDX-00020B',
    title: 'Yandex Stansiya Mini Plus 10 Vt saatlı ağıllı kolonka, göy',
    subcategorySlug: 'agilli-kolonka',
    specs: [
      { label: 'Tip', value: 'Ağıllı kolonka' },
      { label: 'Seriya', value: 'Yandex Stansiya Mini Plus (Mini 2, saatlı)' },
      { label: 'Səs gücü', value: '10 Vt' },
      { label: 'Saat', value: 'Var' },
      { label: 'Rəng', value: 'göy' },
    ],
  },
  {
    sku: 'YNDX-00021-BLACK',
    title: 'Yandex Stansiya Mini Plus 10 Vt ağıllı kolonka, qara',
    subcategorySlug: 'agilli-kolonka',
    specs: [
      { label: 'Tip', value: 'Ağıllı kolonka' },
      { label: 'Seriya', value: 'Yandex Stansiya Mini Plus (Mini 2)' },
      { label: 'Səs gücü', value: '10 Vt' },
      { label: 'Saat', value: 'Yox' },
      { label: 'Rəng', value: 'qara' },
    ],
  },
  {
    sku: 'YNDX-00030BLK',
    title: 'Yandex Stansiya Strit 30 Vt IP67 portativ ağıllı kolonka, qara',
    subcategorySlug: 'portativ-kolonka',
    specs: [
      { label: 'Tip', value: 'Portativ ağıllı kolonka' },
      { label: 'Seriya', value: 'Yandex Stansiya Strit' },
      { label: 'Səs gücü', value: '30 Vt' },
      { label: 'Rəng', value: 'qara' },
    ],
  },
  {
    sku: 'YNDX-00017',
    title: 'Yandex ağıllı lampa E27',
    subcategorySlug: 'agilli-lampa',
    specs: [
      { label: 'Tip', value: 'Ağıllı lampa' },
      { label: 'Seriya', value: 'Yandex Lamp' },
    ],
  },
  {
    sku: 'YNDX-00531',
    title: 'Yandex ağıllı açar',
    subcategorySlug: 'agilli-acar',
    specs: [{ label: 'Tip', value: 'Ağıllı açar' }],
  },
  {
    sku: 'YNDX-00520',
    title: 'Yandex ağıllı hərəkət sensoru',
    subcategorySlug: 'agilli-sensor',
    specs: [{ label: 'Tip', value: 'Hərəkət sensoru' }],
  },
  {
    sku: 'YNDX-0007W',
    title: 'Yandex ağıllı rozetka',
    subcategorySlug: 'agilli-rozetka',
    specs: [{ label: 'Tip', value: 'Ağıllı rozetka' }],
  },
  {
    sku: 'YNDX-00571',
    title: 'Yandex ağıllı pult',
    subcategorySlug: 'agilli-pult',
    specs: [{ label: 'Tip', value: 'IR pult' }],
  },
  {
    sku: 'YNDX-00544',
    title: 'Yandex LED lent',
    subcategorySlug: 'led-lent',
    specs: [{ label: 'Tip', value: 'LED lent' }],
  },
  {
    sku: 'YNDX-00510',
    title: 'Yandex Hub ağıllı ev mərkəzi Zigbee',
    subcategorySlug: 'agilli-ev-merkezi',
    specs: [
      { label: 'Tip', value: 'Ağıllı ev mərkəzi' },
      { label: 'Zigbee', value: 'Var' },
    ],
  },
] as const;

describe('yandex-product-seo', () => {
  const copies = SAMPLES.map((sample) => {
    const title = resolveYandexCatalogName(sample.sku, sample.title);
    return {
      sku: sample.sku,
      title,
      ...resolveYandexProductSeo({
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
      expect(copy.seoTitle).toMatch(/Yandex/i);
      expect(copy.seoTitle).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(/\|\s*IT\s*Market/i);
      expect(copy.seoDescription).not.toMatch(PRICE_PROMISE);
      expect(copy.seoDescription).toMatch(/[əöğüşçıƏÖĞÜŞÇI]/);
    }
  });
});
