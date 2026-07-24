import {
  buildColorFacetWhere,
  buildStorefrontCatalogFacetWhere,
  expandCapacityFilterValue,
} from './catalog-facet-filters.domain';

describe('expandCapacityFilterValue', () => {
  it('expands GB spellings used in the catalog', () => {
    expect(expandCapacityFilterValue('8GB')).toEqual(
      expect.arrayContaining(['8GB', '8 GB', '8gb', '8 gb']),
    );
    expect(expandCapacityFilterValue('1 TB')).toEqual(
      expect.arrayContaining(['1TB', '1 TB']),
    );
  });

  it('keeps freeform values as-is', () => {
    expect(expandCapacityFilterValue('512 GB SSD')).toEqual(['512 GB SSD']);
  });
});

describe('buildColorFacetWhere', () => {
  it('returns undefined for blank color', () => {
    expect(buildColorFacetWhere(undefined)).toBeUndefined();
    expect(buildColorFacetWhere('   ')).toBeUndefined();
  });

  it('matches synonym labels on color attribute keys', () => {
    const where = buildColorFacetWhere('black');
    expect(where).toEqual(
      expect.objectContaining({
        OR: expect.arrayContaining([
          {
            attributes: {
              path: ['Rəng'],
              equals: 'Qara',
            },
          },
        ]),
      }),
    );
  });
});

describe('buildStorefrontCatalogFacetWhere', () => {
  it('returns undefined when no facets are set', () => {
    expect(buildStorefrontCatalogFacetWhere({})).toBeUndefined();
  });

  it('combines price, stock, sale and attribute facets with AND', () => {
    const where = buildStorefrontCatalogFacetWhere({
      minPrice: 100,
      maxPrice: 500,
      inStock: true,
      onSale: true,
      ram: '8GB',
      storage: '256GB',
      color: 'Qara',
    });

    expect(where).toEqual(
      expect.objectContaining({
        AND: expect.arrayContaining([
          expect.objectContaining({
            price: expect.objectContaining({
              gte: expect.anything(),
              lte: expect.anything(),
            }),
          }),
          { previousPrice: { not: null } },
          expect.objectContaining({
            balances: {
              some: {
                onHand: { gt: 0 },
                location: { active: true },
              },
            },
          }),
        ]),
      }),
    );
  });
});
