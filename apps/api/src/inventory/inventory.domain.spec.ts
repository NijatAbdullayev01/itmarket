import { applyOnHandDelta } from './inventory.domain';

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
