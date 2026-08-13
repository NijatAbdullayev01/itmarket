import {
  buildActiveCartShoppersCountSql,
  buildActiveCartShoppersListSql,
  cartShopperKey,
  decodeActiveCartShopperCursor,
  encodeActiveCartShopperCursor,
  uniqueActiveCartShopperCount,
} from './active-cart-shoppers-query';

describe('cart shopper identity', () => {
  it('uses customer id for registered carts and cart id for guests', () => {
    expect(
      cartShopperKey({
        id: 'cart-1',
        customerId: 'cust-9',
      }),
    ).toBe('c:cust-9');
    expect(
      cartShopperKey({
        id: 'cart-2',
        customerId: null,
      }),
    ).toBe('g:cart-2');
  });
});

describe('uniqueActiveCartShopperCount', () => {
  it('counts a registered customer once even with two active carts', () => {
    expect(
      uniqueActiveCartShopperCount([
        {
          id: 'cart-a',
          customerId: 'cust-1',
          status: 'ACTIVE',
          hasItems: true,
        },
        {
          id: 'cart-b',
          customerId: 'cust-1',
          status: 'ACTIVE',
          hasItems: true,
        },
      ]),
    ).toBe(1);
  });

  it('counts each guest cart as a separate shopper', () => {
    expect(
      uniqueActiveCartShopperCount([
        {
          id: 'guest-a',
          customerId: null,
          status: 'ACTIVE',
          hasItems: true,
        },
        {
          id: 'guest-b',
          customerId: null,
          status: 'ACTIVE',
          hasItems: true,
        },
        {
          id: 'cust-cart',
          customerId: 'cust-2',
          status: 'ACTIVE',
          hasItems: true,
        },
      ]),
    ).toBe(3);
  });

  it('ignores empty, checked-out, and abandoned carts', () => {
    expect(
      uniqueActiveCartShopperCount([
        {
          id: 'empty',
          customerId: 'cust-3',
          status: 'ACTIVE',
          hasItems: false,
        },
        {
          id: 'paid',
          customerId: 'cust-4',
          status: 'CHECKED_OUT',
          hasItems: true,
        },
        {
          id: 'old',
          customerId: null,
          status: 'ABANDONED',
          hasItems: true,
        },
        {
          id: 'live',
          customerId: 'cust-5',
          status: 'ACTIVE',
          hasItems: true,
        },
      ]),
    ).toBe(1);
  });
});

describe('active cart shopper SQL', () => {
  it('counts distinct shoppers from non-empty active carts', () => {
    const sql = buildActiveCartShoppersCountSql();
    const text = sql.strings.join(' ');

    expect(text).toContain('carts c');
    expect(text).toContain('cart_items');
    expect(text).toContain('GROUP BY 1');
    expect(text).toContain('ACTIVE');
  });

  it('lists one row per shopper and supports search', () => {
    const sql = buildActiveCartShoppersListSql({
      limit: 20,
      search: 'Ali',
    });
    const text = sql.strings.join(' ');

    expect(text).toContain('PARTITION BY shopper_key');
    expect(text).toContain('ILIKE');
    expect(sql.values).toContain('%Ali%');
    expect(sql.values).toContain(20);
  });
});

describe('active cart shopper cursor encoding', () => {
  it('round-trips lastActivityAt and shopperKey', () => {
    const lastActivityAt = new Date('2026-08-13T10:15:30.123Z');
    const shopperKey = 'c:29efc952-52d6-4ce7-b61e-ba16f9a595c3';
    const encoded = encodeActiveCartShopperCursor(lastActivityAt, shopperKey);

    expect(decodeActiveCartShopperCursor(encoded)).toEqual({
      lastActivityAt,
      shopperKey,
    });
  });

  it('rejects malformed cursors', () => {
    expect(decodeActiveCartShopperCursor('not-valid')).toBeNull();
    expect(decodeActiveCartShopperCursor('')).toBeNull();
    expect(
      decodeActiveCartShopperCursor(
        Buffer.from('not-a-date\nkey', 'utf8').toString('base64url'),
      ),
    ).toBeNull();
  });
});
