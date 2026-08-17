import {
  listFortinetCatalogNameSkus,
  normalizeFortinetSku,
  resolveFortinetCatalogName,
} from './fortinet-product-name';

export const FORTINET_EXCEL_RAW_SKUS = [
  'FS-108F',
  'FS-108F-FPOE',
  'FS-108F-POE',
  'FS-110G-FPOE',
  'FS-124F',
  'FS-124F-FPOE',
  'FS-124F-POE',
  'FS-148F',
  'FS-148F-FPOE',
  'FS-148F-POE',
  'FS-224D-FPOE',
  'FS-224E',
  'FS-224E-POE',
  'FS-248E-FPOE',
  'FS-248E-POE',
  'FS-448E-POE',
  'FS-424E',
  'FON-380',
  'FON-480',
  'FON-580',
  'FON-C71',
  'FG-30G',
  'FWF-30G-E',
  'FG-40F',
  'FG-40F-3G4G',
  'FG-50G',
  'FG-50G-SFP',
  'FG-51G',
  'FG-51G-SFP-POE',
  'FG-60F',
  'FG-61F',
  'FG-70G',
  'FG-71G',
  'FG-80F',
  'FG-81F',
  'FG-90G',
  'FG-91G',
  'FG-100F',
  'FG-100F-LENC',
  'FG-101F',
  'FG-120G',
  'FG-121G',
  'FG-121G-LENC',
  'FVE-100E',
  'FVE-20E4',
  'FVE-50E6',
  'FAP-231F-E',
  'FAP-231G-E',
  'FAP-231K-E',
  'FAP-221E-E',
  'FN-TRAN-LX',
  'FN-TRAN-SX',
  'FN-TRAN-SFP+LR',
  'FN-TRAN-SFP+SR',
  'FEX-200F',
  'SP-CONSOLE-USB-10',
  'SP-FG300E-PS',
  'SP-FG60CPCOR-EU',
  'SP-FG60E-PDC-1',
  'SP-FG60E-PDC-2',
  'SP-RACKTRAY-02',
  'FN-CABLE-SFP+1',
  'FN-CABLE-SFP+3',
] as const;

describe('fortinet-product-name', () => {
  it('normalizes Excel part numbers into unique SKUs', () => {
    expect(normalizeFortinetSku(' fn-tran-sfp+lr ')).toBe('FN-TRAN-SFP-LR');
    expect(normalizeFortinetSku('FN-TRAN-SFP+SR')).toBe('FN-TRAN-SFP-SR');
    expect(normalizeFortinetSku('FN-CABLE-SFP+1')).toBe('FN-CABLE-SFP-1');
    expect(normalizeFortinetSku('FS-108F')).toBe('FS-108F');
    expect(normalizeFortinetSku('FAP-231G-E')).toBe('FAP-231G-E');

    const skus = FORTINET_EXCEL_RAW_SKUS.map(normalizeFortinetSku);
    expect(new Set(skus).size).toBe(skus.length);
    expect(skus).toEqual(expect.arrayContaining(listFortinetCatalogNameSkus()));
  });

  it('covers every Fortinet catalog SKU with a catalog title', () => {
    expect(listFortinetCatalogNameSkus()).toEqual(
      FORTINET_EXCEL_RAW_SKUS.map(normalizeFortinetSku),
    );
    expect(listFortinetCatalogNameSkus()).toHaveLength(63);
  });

  it('keeps family, model and short type without datasheet clauses', () => {
    expect(
      resolveFortinetCatalogName(
        'FS-108F',
        'FortiSwitch 108F 8-port GE fanless kommutator',
      ),
    ).toBe('Fortinet FortiSwitch 108F 8-port fanless kommutator');
    expect(
      resolveFortinetCatalogName('FG-30G', 'FortiGate 30G desktop NGFW'),
    ).toBe('Fortinet FortiGate 30G desktop NGFW');
    expect(
      resolveFortinetCatalogName(
        'FON-380',
        'FortiFone 380 3.5" IP masa telefonu',
      ),
    ).toBe('Fortinet FortiFone 380 3.5" IP masa telefonu');
    expect(
      resolveFortinetCatalogName(
        'FN-TRAN-SFP+LR',
        'Fortinet 10G SFP+ LR 10 km modul',
      ),
    ).toBe('Fortinet FN-TRAN-SFP+LR 10G SFP+ LR 10 km modul');
    expect(
      resolveFortinetCatalogName(
        'FAP-231G-E',
        'FortiAP 231G Wi-Fi 6E indoor AP (region E)',
      ),
    ).toBe('Fortinet FortiAP 231G Wi-Fi 6E Access Point');
    expect(
      resolveFortinetCatalogName(
        'FAP-231K-E',
        'Fortinet FortiAP 231K Wi-Fi 7 indoor AP (region E)',
      ),
    ).toBe('Fortinet FortiAP 231K Wi-Fi 7 Access Point');
    expect(
      resolveFortinetCatalogName(
        'FWF-30G-E',
        'Fortinet FortiWiFi 30G desktop NGFW (Wi-Fi 6, region E)',
      ),
    ).toBe('Fortinet FortiWiFi 30G desktop NGFW');
  });

  it('prefixes Fortinet on unknown titles', () => {
    expect(resolveFortinetCatalogName('UNKNOWN-1', 'Demo NGFW')).toBe(
      'Fortinet Demo NGFW',
    );
    expect(resolveFortinetCatalogName('UNKNOWN-1', 'Fortinet Demo NGFW')).toBe(
      'Fortinet Demo NGFW',
    );
  });
});
