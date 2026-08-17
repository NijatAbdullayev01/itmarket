import {
  buildTwoEProductDescription,
  resolveTwoEProductSeo,
} from './twoe-product-seo';
import { resolveTwoECatalogName } from './twoe-product-name';

describe('twoe-product-seo', () => {
  it('builds Azerbaijani SEO copy under soft limits', () => {
    const title = resolveTwoECatalogName('2E-MF210WB', 'Mouse 2E MF210 WL Black');
    const seo = resolveTwoEProductSeo({
      sku: '2E-MF210WB',
      title,
      subcategorySlug: 'sican',
      specs: [
        { label: 'Bağlantı', value: '2.4 GHz USB receiver' },
        { label: 'Rəng', value: 'qara' },
      ],
    });
    expect(seo.seoTitle.length).toBeGreaterThan(10);
    expect(seo.seoTitle.length).toBeLessThanOrEqual(70);
    expect(seo.seoDescription.length).toBeGreaterThanOrEqual(120);
    expect(seo.seoDescription.length).toBeLessThanOrEqual(170);
    expect(seo.pageIntro).toContain('2E-MF210WB');
    expect(
      buildTwoEProductDescription(seo.pageIntro, [
        { label: 'DPI', value: '1600' },
      ]),
    ).toContain('DPI: 1600');
  });
});
