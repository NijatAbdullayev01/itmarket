import {
  isAccessoryCompanionCandidate,
  isPrimaryDeviceCandidate,
  selectCompanionCandidates,
} from './companion-products.domain';

describe('companion product selection', () => {
  it('treats phone cases and chargers as accessories', () => {
    expect(
      isAccessoryCompanionCandidate({
        name: 'iPhone 17 Pro çexol',
        category: { name: 'Apple', slug: 'apple' },
      }),
    ).toBe(true);
    expect(
      isAccessoryCompanionCandidate({
        name: '20W USB-C Adapter',
        category: { name: 'Smartfonlar və aksesuarlar', slug: 'smartfonlar' },
      }),
    ).toBe(true);
    expect(
      isAccessoryCompanionCandidate({
        name: 'AirPods Pro',
        category: { name: 'Apple', slug: 'apple' },
      }),
    ).toBe(true);
  });

  it('does not treat phones or network gear as accessories', () => {
    expect(
      isAccessoryCompanionCandidate({
        name: 'iPhone 17 Pro',
        category: { name: 'Apple', slug: 'apple' },
      }),
    ).toBe(false);
    expect(
      isAccessoryCompanionCandidate({
        name: 'Cisco nnnnnn 2meagbit',
        category: { name: 'server', slug: 'server' },
      }),
    ).toBe(false);
  });

  it('detects primary devices by product name', () => {
    expect(
      isPrimaryDeviceCandidate({
        name: 'iPhone 17 Pro',
        category: { name: 'Apple', slug: 'apple' },
      }),
    ).toBe(true);
    expect(
      isPrimaryDeviceCandidate({
        name: 'Silikon çexol',
        category: { name: 'Apple', slug: 'apple' },
      }),
    ).toBe(false);
  });

  it('selects only accessories from the same family and prefers same brand', () => {
    const selected = selectCompanionCandidates(
      [
        {
          id: 'server-1',
          name: 'Cisco nnnnnn 2meagbit',
          brandId: 'cisco',
          createdAt: new Date('2026-01-01'),
          category: { name: 'server', slug: 'server' },
          price: 33333,
        },
        {
          id: 'phone-2',
          name: 'iPhone 16',
          brandId: 'apple',
          createdAt: new Date('2026-01-02'),
          category: { name: 'Apple', slug: 'apple' },
          price: 2000,
        },
        {
          id: 'case-samsung',
          name: 'Galaxy çexol',
          brandId: 'samsung',
          createdAt: new Date('2026-01-03'),
          category: { name: 'Smartfonlar və aksesuarlar', slug: 'smartfonlar' },
          price: 25,
        },
        {
          id: 'case-apple',
          name: 'iPhone silikon çexol',
          brandId: 'apple',
          createdAt: new Date('2026-01-04'),
          category: { name: 'Apple', slug: 'apple' },
          price: 49,
        },
        {
          id: 'charger',
          name: 'USB-C charger',
          brandId: null,
          createdAt: new Date('2026-01-05'),
          category: { name: 'Smartfonlar və aksesuarlar', slug: 'smartfonlar' },
          price: 35,
        },
      ],
      { id: 'phone-1', brandId: 'apple' },
      4,
    );

    expect(selected.map((item) => item.id)).toEqual([
      'case-apple',
      'case-samsung',
      'charger',
    ]);
  });

  it('returns empty when family has no accessories', () => {
    const selected = selectCompanionCandidates(
      [
        {
          id: 'server-1',
          name: 'Cisco nnnnnn 2meagbit',
          brandId: 'cisco',
          createdAt: new Date('2026-01-01'),
          category: { name: 'server', slug: 'server' },
          price: 33333,
        },
      ],
      { id: 'phone-1', brandId: 'apple' },
      4,
    );
    expect(selected).toEqual([]);
  });
});
