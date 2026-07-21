import {
  applyOnHandDelta,
  inventoryBalanceSearchMatches,
} from './inventory.domain';

describe('inventory invariant', () => {
  it('applies a receipt without changing reservations', () => {
    expect(applyOnHandDelta({ onHand: 2, reserved: 1 }, 3)).toEqual({
      onHand: 5,
      reserved: 1,
    });
  });

  it('rejects stock below the reserved quantity', () => {
    expect(() => applyOnHandDelta({ onHand: 5, reserved: 4 }, -2)).toThrow(
      'Negative available stock is forbidden',
    );
  });

  it('rejects zero and unsafe deltas', () => {
    expect(() => applyOnHandDelta({ onHand: 1, reserved: 0 }, 0)).toThrow();
    expect(() =>
      applyOnHandDelta({ onHand: 1, reserved: 0 }, Number.MAX_VALUE),
    ).toThrow();
  });
});

describe('inventory balance search', () => {
  const row = {
    sku: 'NBK-TPX1C-512G-32G',
    variantName: '512GB / 32GB · Qara',
    barcode: '99887766',
    productName: 'ThinkPad X1 Carbon',
    brandName: 'Lenovo',
  };

  it('matches sku and barcode fragments', () => {
    expect(inventoryBalanceSearchMatches('NBK-TPX1', row)).toBe(true);
    expect(inventoryBalanceSearchMatches('99887766', row)).toBe(true);
  });

  it('matches model alone', () => {
    expect(inventoryBalanceSearchMatches('ThinkPad', row)).toBe(true);
    expect(inventoryBalanceSearchMatches('X1 Carbon', row)).toBe(true);
  });

  it('matches brand alone', () => {
    expect(inventoryBalanceSearchMatches('Lenovo', row)).toBe(true);
  });

  it('matches brand and model tokens together', () => {
    expect(inventoryBalanceSearchMatches('Lenovo ThinkPad', row)).toBe(true);
    expect(inventoryBalanceSearchMatches('Lenovo X1', row)).toBe(true);
  });

  it('rejects unrelated queries', () => {
    expect(inventoryBalanceSearchMatches('MacBook', row)).toBe(false);
    expect(inventoryBalanceSearchMatches('Lenovo MacBook', row)).toBe(false);
  });
});
