import {
  buildCatalogPriceImportIndex,
  catalogPriceImportLookupKey,
  isValidCatalogPriceMoney,
  normalizeCatalogPriceImportKey,
  resolveCatalogPriceImportRow,
} from './price-import.domain';

describe('catalog price import domain', () => {
  it('normalizes brand/model keys with Azerbaijani locale', () => {
    expect(normalizeCatalogPriceImportKey('  Cisco  ')).toBe('cisco');
    expect(catalogPriceImportLookupKey('Cisco', '3560')).toBe(
      catalogPriceImportLookupKey('cisco', '3560'),
    );
  });

  it('validates money strings', () => {
    expect(isValidCatalogPriceMoney('0')).toBe(true);
    expect(isValidCatalogPriceMoney('1299.99')).toBe(true);
    expect(isValidCatalogPriceMoney('01')).toBe(false);
    expect(isValidCatalogPriceMoney('-5')).toBe(false);
    expect(isValidCatalogPriceMoney('1.999')).toBe(false);
  });

  it('matches a single product and marks rows needing update', () => {
    const index = buildCatalogPriceImportIndex([
      {
        productId: 'p1',
        brandName: 'Cisco',
        modelName: '3560',
        variants: [
          { id: 'v1', price: '100.00', previousPrice: null },
          { id: 'v2', price: '100.00', previousPrice: null },
        ],
      },
    ]);

    const resolved = resolveCatalogPriceImportRow(
      {
        rowNumber: 2,
        brand: 'cisco',
        model: '3560',
        price: '150.00',
      },
      index,
    );

    expect(resolved.status).toBe('matched');
    expect(resolved.productId).toBe('p1');
    expect(resolved.variantIds).toEqual(['v1', 'v2']);
  });

  it('returns unchanged when prices already match', () => {
    const index = buildCatalogPriceImportIndex([
      {
        productId: 'p1',
        brandName: 'Apple',
        modelName: 'iPhone 15',
        variants: [{ id: 'v1', price: '2000.00', previousPrice: null }],
      },
    ]);

    expect(
      resolveCatalogPriceImportRow(
        {
          rowNumber: 2,
          brand: 'Apple',
          model: 'iPhone 15',
          price: '2000',
        },
        index,
      ).status,
    ).toBe('unchanged');
  });

  it('flags ambiguous brand/model matches', () => {
    const index = buildCatalogPriceImportIndex([
      {
        productId: 'p1',
        brandName: 'Acer',
        modelName: 'Aspire',
        variants: [{ id: 'v1', price: '10.00', previousPrice: null }],
      },
      {
        productId: 'p2',
        brandName: 'Acer',
        modelName: 'Aspire',
        variants: [{ id: 'v2', price: '20.00', previousPrice: null }],
      },
    ]);

    const resolved = resolveCatalogPriceImportRow(
      {
        rowNumber: 2,
        brand: 'Acer',
        model: 'Aspire',
        price: '30',
      },
      index,
    );

    expect(resolved.status).toBe('ambiguous');
    expect(resolved.variantIds).toEqual([]);
  });

  it('reports not_found and invalid rows', () => {
    const index = buildCatalogPriceImportIndex([]);

    expect(
      resolveCatalogPriceImportRow(
        {
          rowNumber: 2,
          brand: 'Missing',
          model: 'Model',
          price: '10',
        },
        index,
      ).status,
    ).toBe('not_found');

    expect(
      resolveCatalogPriceImportRow(
        {
          rowNumber: 3,
          brand: '',
          model: 'X',
          price: '10',
        },
        index,
      ).status,
    ).toBe('invalid');
  });
});
