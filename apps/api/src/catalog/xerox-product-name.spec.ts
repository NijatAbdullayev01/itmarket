import {
  isXeroxCompatibleSupply,
  listXeroxCatalogNameSkus,
  normalizeXeroxSku,
  resolveXeroxCatalogName,
  resolveXeroxImportBrand,
} from './xerox-product-name';

export const XEROX_EXCEL_RAW_SKUS = [
  'C325V_DNI',
  'C235V_DNI',
  'C415V_DN',
  'B225V_DNI',
  'B235V_DNI',
  'B305V_DNI',
  'B315V_DNI',
  'B415V_DN',
  '3025V_BI',
  '3025V_NI',
  'B230V_DNI',
  'B310V_DNI',
  '3020V_BI',
  'G&G-106R02773',
  '006R04404',
  '006R04379',
  '006R04387',
  '006R04388',
  '006R04389',
  '006R04390',
  '006R04827',
  '006R04824',
  '006R04825',
  '006R04826',
  '006R04728',
  '006R04764',
  '006R04765',
  '006R04766',
  '006R04767',
] as const;

describe('xerox-product-name', () => {
  it('normalizes Excel part numbers into unique SKUs', () => {
    expect(normalizeXeroxSku(' c325v_dni ')).toBe('C325V_DNI');
    expect(normalizeXeroxSku('G&G-106R02773')).toBe('GG-106R02773');
    expect(normalizeXeroxSku('006R04404')).toBe('006R04404');
    expect(normalizeXeroxSku('3025V_BI')).toBe('3025V_BI');

    const skus = XEROX_EXCEL_RAW_SKUS.map(normalizeXeroxSku);
    expect(new Set(skus).size).toBe(skus.length);
    expect(skus).toEqual(expect.arrayContaining(listXeroxCatalogNameSkus()));
  });

  it('covers every xerox.xlsx SKU with a catalog title', () => {
    expect(listXeroxCatalogNameSkus()).toEqual(
      XEROX_EXCEL_RAW_SKUS.map(normalizeXeroxSku),
    );
    expect(listXeroxCatalogNameSkus()).toHaveLength(29);
  });

  it('keeps series, configuration and short type without datasheet clauses', () => {
    expect(resolveXeroxCatalogName('C325V_DNI', 'Xerox C325')).toBe(
      'Xerox C325 DNI rəngli lazer MFP',
    );
    expect(resolveXeroxCatalogName('C415V_DN', 'C415')).toBe(
      'Xerox VersaLink C415 DN rəngli lazer MFP',
    );
    expect(resolveXeroxCatalogName('B230V_DNI', 'B230')).toBe(
      'Xerox B230 DNI lazer printer',
    );
    expect(resolveXeroxCatalogName('3020V_BI', 'Phaser')).toBe(
      'Xerox Phaser 3020BI lazer printer',
    );
    expect(resolveXeroxCatalogName('006R04388', 'Cyan toner')).toBe(
      'Xerox 006R04388 Cyan toner (C230/C235)',
    );
    expect(resolveXeroxCatalogName('G&G-106R02773', 'clone')).toBe(
      'G&G 106R02773 uyğun qara toner (3020/3025)',
    );
  });

  it('does not treat the G&G clone as Xerox Genuine', () => {
    expect(isXeroxCompatibleSupply('G&G-106R02773')).toBe(true);
    expect(isXeroxCompatibleSupply('006R04404')).toBe(false);
    expect(resolveXeroxImportBrand('G&G-106R02773')).toEqual({
      slug: 'gg',
      name: 'G&G',
    });
    expect(resolveXeroxImportBrand('C325V_DNI')).toEqual({
      slug: 'xerox',
      name: 'Xerox',
    });
  });

  it('prefixes Xerox on unknown titles', () => {
    expect(resolveXeroxCatalogName('UNKNOWN-1', 'Demo MFP')).toBe(
      'Xerox Demo MFP',
    );
    expect(resolveXeroxCatalogName('UNKNOWN-1', 'Xerox Demo MFP')).toBe(
      'Xerox Demo MFP',
    );
  });
});
