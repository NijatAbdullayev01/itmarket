import {
  catalogSearchMatches,
  expandCatalogSearchQuery,
  foldCatalogSearchText,
  tokenizeCatalogSearchQuery,
} from './catalog-search.domain';
import { buildStorefrontCatalogSearchWhere } from './storefront-catalog-search';

describe('catalog search folding and tokenization', () => {
  it('folds Azerbaijani characters to ASCII', () => {
    expect(foldCatalogSearchText('Gümüşü')).toBe('gumusu');
    expect(foldCatalogSearchText('Çəhrayı')).toBe('cehrayi');
    expect(foldCatalogSearchText('Bənövşəyi')).toBe('benovseyi');
  });

  it('keeps multi-word color phrases as one unit', () => {
    expect(tokenizeCatalogSearchQuery('iphone space gray')).toEqual([
      'iphone',
      'space gray',
    ]);
    expect(tokenizeCatalogSearchQuery('samsung titan qara')).toEqual([
      'samsung',
      'titan qara',
    ]);
  });

  it('expands English color words to Azerbaijani labels', () => {
    const [unit] = expandCatalogSearchQuery('black');
    expect(unit?.terms).toEqual(
      expect.arrayContaining(['black', 'Qara', 'qara']),
    );
    expect(unit?.colorLabels).toEqual(expect.arrayContaining(['Qara', 'black']));
  });
});

describe('catalogSearchMatches', () => {
  const row = {
    sku: 'APL-IP15-128-QRA',
    variantName: '128GB · Qara',
    barcode: '1234567890123',
    productName: 'iPhone 15',
    brandName: 'Apple',
    colorName: 'Qara',
    categoryName: 'Smartfonlar',
  };

  it('matches brand, model, sku and barcode', () => {
    expect(catalogSearchMatches('Apple', row)).toBe(true);
    expect(catalogSearchMatches('iPhone', row)).toBe(true);
    expect(catalogSearchMatches('APL-IP15', row)).toBe(true);
    expect(catalogSearchMatches('1234567890123', row)).toBe(true);
  });

  it('matches Azerbaijani color via English query', () => {
    expect(catalogSearchMatches('black', row)).toBe(true);
    expect(catalogSearchMatches('Apple black', row)).toBe(true);
    expect(catalogSearchMatches('iPhone black', row)).toBe(true);
  });

  it('matches ASCII-folded color queries', () => {
    expect(
      catalogSearchMatches('gumusu', {
        ...row,
        colorName: 'Gümüşü',
        variantName: '128GB · Gümüşü',
        sku: 'APL-IP15-128-GMS',
      }),
    ).toBe(true);
    expect(
      catalogSearchMatches('silver', {
        ...row,
        colorName: 'Gümüşü',
        variantName: '128GB · Gümüşü',
      }),
    ).toBe(true);
  });

  it('requires every token to match (AND)', () => {
    expect(catalogSearchMatches('Apple Samsung', row)).toBe(false);
    expect(catalogSearchMatches('iPhone red', row)).toBe(false);
  });

  it('matches titan compound colors from English', () => {
    const titanRow = {
      ...row,
      colorName: 'Titan Qara',
      variantName: '256GB · Titan Qara',
    };
    expect(catalogSearchMatches('titan black', titanRow)).toBe(true);
    expect(catalogSearchMatches('black', titanRow)).toBe(true);
  });
});

describe('buildStorefrontCatalogSearchWhere', () => {
  it('ignores blank search', () => {
    expect(buildStorefrontCatalogSearchWhere(undefined)).toBeUndefined();
    expect(buildStorefrontCatalogSearchWhere('   ')).toBeUndefined();
  });

  it('builds OR clause for a single unit', () => {
    const where = buildStorefrontCatalogSearchWhere('black');
    expect(where).toEqual(
      expect.objectContaining({
        OR: expect.any(Array),
      }),
    );
    expect(where?.AND).toBeUndefined();
  });

  it('builds AND of units for multi-word queries', () => {
    const where = buildStorefrontCatalogSearchWhere('iphone black');
    expect(where).toEqual(
      expect.objectContaining({
        AND: expect.any(Array),
      }),
    );
    expect(where?.AND).toHaveLength(2);
  });
});
