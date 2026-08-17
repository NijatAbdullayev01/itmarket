import {
  listMirsanCatalogNameSkus,
  mirsanSkuForGenerator,
  normalizeMirsanSku,
  resolveMirsanCatalogName,
} from './mirsan-product-name';

export const MIRSAN_EXCEL_RAW_SKUS = [
  'MR.FAN2WT.01',
  'MR.WTC12U66MN.02',
  'MR.WTC09U66MN.02',
  'MR.GTN42U61.01_PRF63',
  'MR.HD.GTN42U81.01_PRF63',
  'MR.GTS42U812.01',
  'MR.PRZ1U10O.PRFR.SC',
  'MR.PRZ42U2412D.SC',
  'MR.PRZ42U20XC13+4XC19',
  'MR.PRZ42U20XC13+4XC19.AMP.PDU',
  'MR.PRZ42U2422D.SC',
  'MR.PRZ42U24P.C13',
  'MR.PRZ42U24D.SC',
  'MR.PRZ42U24D.MCB.IE',
] as const;

describe('mirsan-product-name', () => {
  it('normalizes Excel part numbers into unique SKUs', () => {
    expect(normalizeMirsanSku(' MR.FAN2WT.01 ')).toBe('MR.FAN2WT.01');
    expect(normalizeMirsanSku('MR.PRZ42U20XC13+4XC19')).toBe(
      'MR.PRZ42U20XC13-4XC19',
    );
    expect(normalizeMirsanSku('MR.PRZ42U20XC13+4XC19.AMP.PDU')).toBe(
      'MR.PRZ42U20XC13-4XC19.AMP.PDU',
    );
    expect(normalizeMirsanSku('MR.GTN42U61.01_PRF63')).toBe(
      'MR.GTN42U61.01_PRF63',
    );

    const skus = MIRSAN_EXCEL_RAW_SKUS.map(normalizeMirsanSku);
    expect(new Set(skus).size).toBe(skus.length);
    expect(skus).toEqual(expect.arrayContaining(listMirsanCatalogNameSkus()));
  });

  it('covers every mirsan.xlsx SKU with a catalog title', () => {
    expect(listMirsanCatalogNameSkus()).toEqual(
      MIRSAN_EXCEL_RAW_SKUS.map(normalizeMirsanSku),
    );
    expect(listMirsanCatalogNameSkus()).toHaveLength(14);
  });

  it('keeps generated store SKUs unique across the pricelist', () => {
    const compact = (sku: string) =>
      mirsanSkuForGenerator(sku)
        .replace(/[^A-Z0-9]/gi, '')
        .slice(0, 16);
    const generated = MIRSAN_EXCEL_RAW_SKUS.map(compact);
    expect(new Set(generated).size).toBe(generated.length);
  });

  it('keeps series, size and type without datasheet clauses', () => {
    expect(
      resolveMirsanCatalogName(
        'MR.FAN2WT.01',
        '2fans, analog thermostat controlled fan module',
      ),
    ).toBe('Mirsan 2-fan analog termostatlı ventilyator paneli');
    expect(
      resolveMirsanCatalogName(
        'MR.WTC12U66MN.02',
        '12U W=600mm D=600mm Wall Type Assembled COM-BOX',
      ),
    ).toBe('Mirsan WTC Com-Box 12U 600×600 divar şkafı (boz, yığılı)');
    expect(
      resolveMirsanCatalogName('MR.GTS42U812.01', 'GT Server 42U 800x1200'),
    ).toBe('Mirsan GTS 42U 800×1200 server şkafı');
    expect(
      resolveMirsanCatalogName(
        'MR.PRZ42U20XC13+4XC19.AMP.PDU',
        'Basic PDU 32A',
      ),
    ).toBe('Mirsan Basic PDU 42U 20×C13+4×C19, V/A, 32A');
  });

  it('prefixes Mirsan on unknown titles', () => {
    expect(resolveMirsanCatalogName('UNKNOWN-1', 'Demo şkaf')).toBe(
      'Mirsan Demo şkaf',
    );
    expect(resolveMirsanCatalogName('UNKNOWN-1', 'Mirsan Demo şkaf')).toBe(
      'Mirsan Demo şkaf',
    );
  });
});
