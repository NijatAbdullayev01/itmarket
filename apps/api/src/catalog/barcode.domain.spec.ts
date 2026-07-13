import { assertUniqueActiveBarcode } from './barcode.domain';

describe('active barcode invariant', () => {
  const existing = [
    { id: 'one', barcode: '12345678', status: 'ACTIVE' as const },
  ];

  it('rejects the same active barcode', () => {
    expect(() =>
      assertUniqueActiveBarcode(existing, {
        id: 'two',
        barcode: '12345678',
        status: 'ACTIVE',
      }),
    ).toThrow('Active barcode must be unique');
  });

  it('allows archived reuse without weakening the DB active constraint', () => {
    expect(() =>
      assertUniqueActiveBarcode(existing, {
        id: 'two',
        barcode: '12345678',
        status: 'ARCHIVED',
      }),
    ).not.toThrow();
  });
});
