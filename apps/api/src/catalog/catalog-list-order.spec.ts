import { catalogListOrderBy } from './catalog-list-order';

describe('catalogListOrderBy', () => {
  it('appends unique id so cursor pages do not skip tied timestamps', () => {
    expect(catalogListOrderBy('createdAt', 'desc')).toEqual([
      { createdAt: 'desc' },
      { id: 'desc' },
    ]);
  });

  it('keeps the requested name/sortOrder direction on both fields', () => {
    expect(catalogListOrderBy('name', 'asc')).toEqual([
      { name: 'asc' },
      { id: 'asc' },
    ]);
    expect(catalogListOrderBy('sortOrder', 'asc')).toEqual([
      { sortOrder: 'asc' },
      { id: 'asc' },
    ]);
  });

  it('falls back to createdAt desc for unknown sort or direction', () => {
    expect(catalogListOrderBy('price', 'sideways')).toEqual([
      { createdAt: 'desc' },
      { id: 'desc' },
    ]);
  });
});
