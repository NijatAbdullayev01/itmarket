import {
  listApacerCatalogNameSkus,
  normalizeApacerSku,
  resolveApacerCatalogName,
  resolveApacerIdentitySku,
} from './apacer-product-name';

export const APACER_EXCEL_RAW_PARTS = [
  'AP512GAS2280Q4U5-1',
  'AP1TBAS2280Q4U5-1',
  'AP2TBAS2280Q4U5-1',
  'AP1TBAS2280Q4U5-1',
  'AS16GGB32CSYBGH',
  'AP256GAS725B-1',
  'AP512GAS725B-1',
  'AP1TBAS725B-1',
  'AP1TBAS723B-1',
  'AP2TBAS723B-1',
  'AP1TBAC237B-1',
  'AP1TBAC237U-1',
  'AP1TBAC237R-1',
  'AP2TBAC237B-1',
  'AP2TBAC237U-1',
  'AP2TBAC237R-1',
  'AP4TBAC533B-1',
  'AP4TBAC237B-1',
  'AP4TBAC732B-1',
  'AP5TBAC237B-1',
  'AP5TBAC533B-1',
  'AP5TBAC732B-1',
  'AP2TBAC532B-1',
  'AP2TBAC630T-1',
  'AP2TBAC631U-1',
  'AP2TBAC731B-1',
  'AP2TBAC732B-1',
  'AP2TBAC532W-1',
  'AP4TBAC236B-1',
  'AP128GAH25BB-1',
  'AP32GAH750S-1',
  'AP32GAH357U-1',
  'AP64GAH353C-1',
  'AP128GAH353C-1',
  'AP32GAH155U-1',
  'AP128GAH350B-1',
  'AP64GAH25BR-1',
  'AP64GAH357U-1',
  'AP128GAH25BR-1',
  'AP32GAH180R-1',
  'AP64GAH180R-1',
  'AP128GAH180R-1',
] as const;

export const APACER_EXCEL_TITLES = [
  'Apacer AS2280Q4U 512GB M.2 NVMe (PS5)',
  'Apacer AS2280Q4U 1TB M.2 NVMe (PS5)',
  'Apacer AS2280Q4U 2TB M.2 NVMe (PS5)',
  'Apacer AS2280Q4U 1TB M.2 NVMe (Standard)',
  'Apacer 16GB DDR4 3200 SODIMM',
  'Apacer AS725 256GB MagSafe xarici SSD',
  'Apacer AS725 512GB MagSafe xarici SSD',
  'Apacer AS725 1TB MagSafe xarici SSD',
  'Apacer AS723 1TB xarici SSD',
  'Apacer AS723 2TB xarici SSD',
  'Apacer AC237 1TB xarici HDD (qara)',
  'Apacer AC237 1TB xarici HDD (mavi)',
  'Apacer AC237 1TB xarici HDD (qranat qırmızı)',
  'Apacer AC237 2TB xarici HDD (qara)',
  'Apacer AC237 2TB xarici HDD (mavi)',
  'Apacer AC237 2TB xarici HDD (qranat qırmızı)',
  'Apacer AC533 4TB xarici HDD (qara)',
  'Apacer AC237 4TB xarici HDD (qara)',
  'Apacer AC732 4TB xarici HDD (qara)',
  'Apacer AC237 5TB xarici HDD (qara)',
  'Apacer AC533 5TB xarici HDD (qara)',
  'Apacer AC732 5TB xarici HDD (qara)',
  'Apacer AC532 2TB xarici HDD (qara)',
  'Apacer AC630 2TB xarici HDD (narıncı)',
  'Apacer AC631 2TB xarici HDD (mavi)',
  'Apacer AC731 2TB xarici HDD (qara)',
  'Apacer AC732 2TB xarici HDD (qara)',
  'Apacer AC532 2TB xarici HDD (ağ)',
  'Apacer AC236 4TB xarici HDD (qara)',
  'Apacer AH25B 128GB USB flash (qara)',
  'Apacer AH750 32GB USB flash OTG (gümüşü)',
  'Apacer AH357 32GB USB flash (mavi)',
  'Apacer AH353 64GB USB flash (qızılı)',
  'Apacer AH353 128GB USB flash (qızılı)',
  'Apacer AH155 32GB USB flash (mavi)',
  'Apacer AH350 128GB USB flash (qara)',
  'Apacer AH25B 64GB USB flash (qırmızı)',
  'Apacer AH357 64GB USB flash (mavi)',
  'Apacer AH25B 128GB USB flash (qırmızı)',
  'Apacer AH180 32GB USB-C/A OTG flash',
  'Apacer AH180 64GB USB-C/A OTG flash',
  'Apacer AH180 128GB USB-C/A OTG flash',
] as const;

describe('apacer-product-name', () => {
  it('covers every apacer.xlsx row with a unique identity SKU', () => {
    const identities = APACER_EXCEL_RAW_PARTS.map((part, index) =>
      resolveApacerIdentitySku(part, APACER_EXCEL_TITLES[index]!),
    );
    expect(identities).toHaveLength(42);
    expect(new Set(identities).size).toBe(42);
    expect(listApacerCatalogNameSkus()).toEqual(
      expect.arrayContaining(identities),
    );
    expect(listApacerCatalogNameSkus()).toHaveLength(42);
  });

  it('disambiguates the shared 1TB AS2280Q4U part number', () => {
    expect(
      resolveApacerIdentitySku(
        'AP1TBAS2280Q4U5-1',
        'Apacer AS2280Q4U 1TB M.2 NVMe (PS5)',
      ),
    ).toBe('AS2280Q4U-1TB-PS5');
    expect(
      resolveApacerIdentitySku(
        'AP1TBAS2280Q4U5-1',
        'Apacer AS2280Q4U 1TB M.2 NVMe (Standard)',
      ),
    ).toBe('AP1TBAS2280Q4U5-1');
  });

  it('normalizes and resolves catalog titles', () => {
    expect(normalizeApacerSku(' ap1tbac237b-1 ')).toBe('AP1TBAC237B-1');
    expect(resolveApacerCatalogName('AP1TBAC237B-1', 'fallback')).toBe(
      'Apacer AC237 1TB xarici HDD (qara)',
    );
    expect(resolveApacerCatalogName('UNKNOWN-SKU', 'Apacer Custom')).toBe(
      'Apacer Custom',
    );
  });
});
