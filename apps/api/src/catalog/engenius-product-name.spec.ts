import {
  listEnGeniusCatalogNameSkus,
  resolveEnGeniusCatalogName,
} from './engenius-product-name';

describe('engenius-product-name', () => {
  it('covers every EnGenius Excel SKU with a catalog title', () => {
    expect(listEnGeniusCatalogNameSkus()).toEqual([
      'EWS1200-28TFP',
      'ECS1528P',
      'ECS1552',
      'EWS7928P',
    ]);
  });

  it('keeps model and port summary without datasheet clauses', () => {
    expect(
      resolveEnGeniusCatalogName(
        'EWS1200-28TFP',
        'AP Controller Switch 50AP 24-port GbE PoE.af/at(+) 410W 4xSFP L2 19i',
      ),
    ).toBe('EnGenius EWS1200-28TFP 24-port PoE+ kommutator');
    expect(
      resolveEnGeniusCatalogName(
        'ECS1552',
        'Cloud Managed Switch 48-port GbE 4xSFP+ L2+ 19i',
      ),
    ).toBe('EnGenius ECS1552 48-port kommutator');
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
