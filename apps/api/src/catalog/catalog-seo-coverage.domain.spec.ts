import { CatalogStatus } from '../generated/prisma/client';
import {
  availableQtyFromBalances,
  buildCoverageBucket,
  isBlankSeoField,
  missingSeoFields,
} from './catalog-seo-coverage.domain';

describe('catalog-seo-coverage.domain', () => {
  it('treats whitespace-only SEO fields as blank', () => {
    expect(isBlankSeoField(null)).toBe(true);
    expect(isBlankSeoField('')).toBe(true);
    expect(isBlankSeoField('   ')).toBe(true);
    expect(isBlankSeoField('Başlık')).toBe(false);
  });

  it('lists all missing SEO fields', () => {
    expect(
      missingSeoFields({
        seoTitle: '  ',
        seoDescription: null,
        description: 'Intro',
      }),
    ).toEqual(['seoTitle', 'seoDescription']);
  });

  it('sums sellable stock across balances', () => {
    expect(
      availableQtyFromBalances([
        { onHand: 5, reserved: 2 },
        { onHand: 1, reserved: 1 },
        { onHand: 0, reserved: 0 },
      ]),
    ).toBe(3);
  });

  it('includes parentId on category coverage samples for subcategory deep-links', () => {
    const bucket = buildCoverageBucket(
      'category',
      [
        {
          id: 'root-1',
          name: 'Telefonlar',
          slug: 'telefonlar',
          status: CatalogStatus.ACTIVE,
          seoTitle: null,
          seoDescription: null,
          description: null,
          parentId: null,
        },
        {
          id: 'child-1',
          name: 'Smartfonlar',
          slug: 'smartfonlar',
          status: CatalogStatus.ACTIVE,
          seoTitle: null,
          seoDescription: 'ok',
          description: 'ok',
          parentId: 'root-1',
        },
      ],
      25,
    );

    expect(bucket.missingAny).toBe(2);
    expect(bucket.samples[0]?.parentId).toBeNull();
    expect(bucket.samples[1]?.parentId).toBe('root-1');
  });
});
