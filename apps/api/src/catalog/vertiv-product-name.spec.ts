import {
  listVertivCatalogNameSkus,
  resolveVertivCatalogName,
} from './vertiv-product-name';

describe('vertiv-product-name', () => {
  it('covers every Vertiv Excel SKU with a catalog title', () => {
    expect(listVertivCatalogNameSkus()).toEqual([
      'GXT5-5000IRT5UXLN',
      'GXTRT-1500IRT2UXL',
      'LI32111CT00',
      'LI32121CT00',
      'LI38000B020',
      'RDU101',
    ]);
  });

  it('keeps series and capacity without datasheet clauses', () => {
    expect(
      resolveVertivCatalogName(
        'GXT5-5000IRT5UXLN',
        'Liebert GXT5 1ph UPS, 5kVA, input plug - hardwired, 5U, output - 230V',
      ),
    ).toBe('Vertiv Liebert GXT5 5kVA 230V');
    expect(
      resolveVertivCatalogName(
        'LI38000B020',
        'UPS Network Management Card LIEBERT GXT-MT+ SNMP card',
      ),
    ).toBe('Vertiv Liebert GXT-MT+ SNMP kartı');
  });

  it('prefixes Vertiv on unknown Liebert titles', () => {
    expect(resolveVertivCatalogName('UNKNOWN-SKU', 'Liebert Demo Unit')).toBe(
      'Vertiv Liebert Demo Unit',
    );
    expect(
      resolveVertivCatalogName('UNKNOWN-SKU', 'Vertiv Liebert Demo Unit'),
    ).toBe('Vertiv Liebert Demo Unit');
  });
});
