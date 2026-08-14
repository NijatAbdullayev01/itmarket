import {
  listDeltaCatalogNameSkus,
  resolveDeltaCatalogName,
} from './delta-product-name';

describe('delta-product-name', () => {
  it('covers every Delta Excel SKU with a catalog title', () => {
    expect(listDeltaCatalogNameSkus()).toEqual([
      'UPA302R2RX0B035',
      'UPS203R6RT2N035',
      'UPS303HH330N035',
      'UPS403HH330N035',
      'UPS502R2RT2N035',
      'BBU161B107035',
      'BBU201B109035',
      'SCMS100035',
    ]);
  });

  it('keeps series and capacity without datasheet clauses', () => {
    expect(
      resolveDeltaCatalogName(
        'UPS303HH330N035',
        'Delta Electronics HPH Gen.2 30kVA, tower type, 3P4W 400V, ready for battery, with battery kit',
      ),
    ).toBe('Delta Ultron HPH Gen.2 30kVA 400V');
    expect(
      resolveDeltaCatalogName(
        'SCMS100035',
        'Delta Electronics Mini SNMP IPv6 card (NEW), Hot swappable',
      ),
    ).toBe('Delta Mini SNMP IPv6 kartı');
  });

  it('strips Electronics from unknown Delta titles', () => {
    expect(
      resolveDeltaCatalogName('UNKNOWN-SKU', 'Delta Electronics Demo Unit'),
    ).toBe('Delta Demo Unit');
  });
});
