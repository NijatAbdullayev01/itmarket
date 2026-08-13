import {
  HOME_BESTSELLERS_LIMIT,
  mergeProductSoldQuantities,
  takeTopSoldProducts,
} from './bestsellers-ranking';

describe('bestsellers ranking', () => {
  it('sums online and POS quantities for the same product', () => {
    expect(
      mergeProductSoldQuantities(
        [{ productId: 'a', soldQty: 3 }],
        [
          { productId: 'a', soldQty: 5 },
          { productId: 'b', soldQty: 2 },
        ],
      ),
    ).toEqual([
      { productId: 'a', soldQty: 8 },
      { productId: 'b', soldQty: 2 },
    ]);
  });

  it('ignores zero and negative quantities', () => {
    expect(
      mergeProductSoldQuantities([
        { productId: 'a', soldQty: 0 },
        { productId: 'b', soldQty: -4 },
        { productId: 'c', soldQty: 1 },
      ]),
    ).toEqual([{ productId: 'c', soldQty: 1 }]);
  });

  it('keeps the homepage rail length', () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({
      productId: `p${index}`,
      soldQty: 12 - index,
    }));
    expect(takeTopSoldProducts(rows)).toHaveLength(HOME_BESTSELLERS_LIMIT);
  });
});
