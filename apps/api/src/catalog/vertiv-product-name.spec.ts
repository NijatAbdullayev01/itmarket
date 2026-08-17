import {
  listVertivCatalogNameSkus,
  normalizeVertivSku,
  resolveVertivCatalogName,
} from './vertiv-product-name';

describe('vertiv-product-name', () => {
  it('normalizes Excel model codes into unique SKUs', () => {
    expect(normalizeVertivSku('gxe3-3000irt2uxl')).toBe('GXE3-3000IRT2UXL');
    expect(normalizeVertivSku(' IS-UNITY-SNMP ')).toBe('IS-UNITY-SNMP');
    expect(normalizeVertivSku('RMKIT18-32')).toBe('RMKIT18-32');

    const models = [
      'GXE3-3000IRT2UXL',
      'GXT5-6000IRT5UXLN',
      'GXT5-10KIRT5UXLN',
      'GXT5-10KIRT5UXLE',
      'RDU101',
      'RDU120',
      'IS-UNITY-SNMP',
      'LI38000B020',
      'RMKIT18-32',
    ];
    const skus = models.map(normalizeVertivSku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it('covers every Vertiv Excel SKU with a catalog title', () => {
    expect(listVertivCatalogNameSkus()).toEqual([
      'GXE3-3000IRT2UXL',
      'GXT5-6000IRT5UXLN',
      'GXT5-10KIRT5UXLN',
      'GXT5-10KIRT5UXLE',
      'RDU101',
      'RDU120',
      'IS-UNITY-SNMP',
      'LI38000B020',
      'RMKIT18-32',
      'GXT5-5000IRT5UXLN',
      'GXTRT-1500IRT2UXL',
      'LI32111CT00',
      'LI32121CT00',
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
    ).toBe('Vertiv Liebert GXT-MT+/RT+ SNMP kartı');
    expect(
      resolveVertivCatalogName(
        'GXT5-10KIRT5UXLE',
        'Vertiv Liebert GXT5 UPS, 10000 VA / 10000 W, without rail kit',
      ),
    ).toBe('Vertiv Liebert GXT5 10kVA 230V E');
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
