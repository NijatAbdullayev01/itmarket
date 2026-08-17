import {
  isEnGeniusCompactCodeName,
  listEnGeniusCatalogNameSkus,
  normalizeEnGeniusSku,
  resolveEnGeniusCatalogName,
} from './engenius-product-name';

const EXCEL_RAW_SKUS = [
  'ECS1008P',
  'ECS1112FP',
  'ECS1528P',
  'ECS1528FP',
  'ECS1552P',
  'ECS2552FP',
  'ECS1552FP',
  'ECS5512F',
  'SFP2213-10',
  'ECW-120',
  'EWS-357-FIT',
  'ECW-215',
  'EWS356AP-FIT',
  'EWS-356-Fit',
  'ECW120 - Ceiling Mount',
  'EWS357AP-FIT',
  'ECW-160',
  'ECW130 - Ceiling Mount',
  'ECW-220',
  'EWS-377',
  'ECW215 - Wallplate AX',
  'ENH1350EXT',
  'ECW160 - Outdoor',
  'ECW-260',
  'EWS377AP-FIT',
  'EWS850AP-FIT',
  'EWS7928P-FIT',
  'ECW230 - Ceiling mount AX',
  'ECW-336',
  'ECW220S - Ceiling mount',
  'EWS7928FP-FIT',
  'EWS7952FP-FIT',
  'ESG510',
  'FitCon100',
];

describe('engenius-product-name', () => {
  it('detects leftover compact manufacturer codes', () => {
    expect(isEnGeniusCompactCodeName('ECS1552')).toBe(true);
    expect(isEnGeniusCompactCodeName('EWS1200-28TFP')).toBe(true);
    expect(isEnGeniusCompactCodeName('EWS7928P')).toBe(true);
    expect(
      isEnGeniusCompactCodeName('EnGenius ECS1552 48-port Cloud kommutator'),
    ).toBe(false);
  });

  it('normalizes messy Excel part numbers into canonical SKUs', () => {
    expect(normalizeEnGeniusSku('ECW-120')).toBe('ECW120');
    expect(normalizeEnGeniusSku('ECW120 - Ceiling Mount')).toBe('ECW120');
    expect(normalizeEnGeniusSku('EWS356AP-FIT')).toBe('EWS356-FIT');
    expect(normalizeEnGeniusSku('EWS-356-Fit')).toBe('EWS356-FIT');
    expect(normalizeEnGeniusSku('EWS357AP-FIT')).toBe('EWS357AP');
    expect(normalizeEnGeniusSku('EWS-357-FIT')).toBe('EWS357-FIT');
    expect(normalizeEnGeniusSku('EWS-377')).toBe('EWS377-FIT');
    expect(normalizeEnGeniusSku('EWS377AP-FIT')).toBe('EWS377AP');
    expect(normalizeEnGeniusSku('EWS850AP-FIT')).toBe('EWS850-FIT');
    expect(normalizeEnGeniusSku('FitCon100')).toBe('FITCON100');
    expect(normalizeEnGeniusSku('ECW220S - Ceiling mount')).toBe('ECW220S');

    const canonical = EXCEL_RAW_SKUS.map(normalizeEnGeniusSku);
    expect(new Set(canonical).size).toBe(30);
    for (const sku of canonical) {
      expect(listEnGeniusCatalogNameSkus()).toContain(sku);
    }
  });

  it('covers every unique EnGenius Excel SKU with a catalog title', () => {
    expect(listEnGeniusCatalogNameSkus()).toEqual([
      'ECS1008P',
      'ECS1112FP',
      'ECS1528P',
      'ECS1528FP',
      'ECS1552',
      'ECS1552P',
      'ECS2552FP',
      'ECS1552FP',
      'ECS5512F',
      'SFP2213-10',
      'ECW120',
      'EWS357-FIT',
      'ECW215',
      'EWS356-FIT',
      'EWS357AP',
      'ECW160',
      'ECW130',
      'ECW220',
      'EWS377-FIT',
      'ENH1350EXT',
      'ECW260',
      'EWS377AP',
      'EWS850-FIT',
      'EWS1200-28TFP',
      'EWS7928P',
      'EWS7928P-FIT',
      'ECW230',
      'ECW336',
      'ECW220S',
      'EWS7928FP-FIT',
      'EWS7952FP-FIT',
      'ESG510',
      'FITCON100',
    ]);
  });

  it('keeps model and type without datasheet clauses', () => {
    expect(
      resolveEnGeniusCatalogName(
        'ECS1528P',
        'Cloud Managed Switch with 24 GbE PoE + 4 x SFP+',
      ),
    ).toBe('EnGenius ECS1528P 24-port PoE+ Cloud kommutator');
    expect(resolveEnGeniusCatalogName('ECS1552', 'ECS1552')).toBe(
      'EnGenius ECS1552 48-port Cloud kommutator',
    );
    expect(resolveEnGeniusCatalogName('EWS1200-28TFP', 'EWS1200-28TFP')).toBe(
      'EnGenius EWS1200-28TFP 24-port PoE+ kommutator',
    );
    expect(resolveEnGeniusCatalogName('EWS7928P', 'EWS7928P')).toBe(
      'EnGenius EWS7928P 24-port Neutron PoE+ kommutator',
    );
    expect(
      resolveEnGeniusCatalogName(
        'ECW-336',
        'Cloud Managed AP, WiFi 6e Tri-Band Concurrent Ceiling Mount AP',
      ),
    ).toBe('EnGenius ECW336 Wi-Fi 6E 4×4 Cloud Access Point');
    expect(
      resolveEnGeniusCatalogName('FitCon100', 'FIT Series Management'),
    ).toBe('EnGenius FitController (FitCon100) idarəetmə platforması');
  });

  it('prefixes EnGenius on unknown titles', () => {
    expect(resolveEnGeniusCatalogName('UNKNOWN-SKU', 'Demo Switch')).toBe(
      'EnGenius Demo Switch',
    );
    expect(
      resolveEnGeniusCatalogName('UNKNOWN-SKU', 'EnGenius Demo Switch'),
    ).toBe('EnGenius Demo Switch');
  });
});
