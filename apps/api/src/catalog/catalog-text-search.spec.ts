import { buildCatalogProductSearchWhere } from './catalog-text-search';

describe('buildCatalogProductSearchWhere', () => {
  it('uses the indexed variant search document instead of product ILIKE ORs', () => {
    const serialized = JSON.stringify(buildCatalogProductSearchWhere('cd361'));
    expect(serialized).toContain('"searchDocument":{"contains":"cd361"}');
    expect(serialized).not.toContain('"description":{"contains"');
    expect(serialized).not.toContain('"seoTitle":{"contains"');
    expect(serialized).not.toContain('"seoDescription":{"contains"');
    expect(serialized).not.toContain('"slug":{"contains"');
  });

  it('still matches products that have no variants by name', () => {
    const where = buildCatalogProductSearchWhere('Galaxy');
    expect(where).toEqual(
      expect.objectContaining({
        OR: expect.arrayContaining([
          expect.objectContaining({
            AND: expect.arrayContaining([
              { variants: { none: {} } },
              expect.objectContaining({
                name: { contains: 'galaxy', mode: 'insensitive' },
              }),
            ]),
          }),
        ]),
      }),
    );
  });
});
