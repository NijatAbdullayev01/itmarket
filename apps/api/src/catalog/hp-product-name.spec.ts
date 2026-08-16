import {
  buildHpCatalogProductName,
  buildHpVariantAttributes,
  buildHpVariantName,
  cleanHpModelName,
  isHpCatalogColorValue,
  listHpGpuCatalogSkus,
  normalizeHpSku,
  sanitizeHpRequiredSpecs,
} from './hp-product-name';

describe('hp-product-name', () => {
  it('normalizes HP part numbers', () => {
    expect(normalizeHpSku('8X9C9EA')).toBe('8X9C9EA');
    expect(normalizeHpSku(' 5z7d9aa ')).toBe('5Z7D9AA');
  });

  it('keeps brand-line model without CPU RAM storage or SKU', () => {
    expect(
      buildHpCatalogProductName(
        'HP 250G10 15.6" (8X9C9EA)',
        [
          { label: 'Model', value: 'HP 250G10 / 15.6"' },
          { label: 'Prosessor', value: 'Intel Core i5-1335U' },
          { label: 'Operativ yaddaş', value: '8GB DDR4 3200' },
          { label: 'Yaddaş', value: '256GB PCIe NVMe SSD' },
        ],
        '8X9C9EA',
      ),
    ).toBe('HP 250 G10');
  });

  it('prefixes HP and normalizes ZBook All-in-One spelling', () => {
    expect(cleanHpModelName('Zbook Power 16 G11')).toBe(
      'HP ZBook Power 16 G11',
    );
    expect(cleanHpModelName('HP All- in-one / 24"')).toBe('HP All-in-One 24"');
    expect(cleanHpModelName('Desktop 290 G9 Pro Tower')).toBe(
      'HP Desktop 290 G9 Pro Tower',
    );
  });

  it('uses official GPU names instead of HP GPU placeholders', () => {
    expect(listHpGpuCatalogSkus()).toEqual([
      '5Z7D9AA',
      '8D6B8AA',
      '20X24AA',
      '8D6B7AA',
    ]);
    expect(buildHpCatalogProductName('HP GPU (5Z7D9AA)', [], '5Z7D9AA')).toBe(
      'HP NVIDIA RTX A2000 12GB',
    );
    expect(buildHpCatalogProductName('HP GPU (8D6B7AA)', [], '8D6B7AA')).toBe(
      'HP NVIDIA RTX 4000 Ada 20GB',
    );
  });

  it('keeps color language and layout out of accessory names', () => {
    expect(cleanHpModelName('HP 230 WL BLK KBD (3L1E7AA)')).toBe(
      'HP 230 Wireless Keyboard',
    );
    expect(cleanHpModelName('HP 330 Wls Mse and KB Combo RUSS')).toBe(
      'HP 330 Wireless Mouse and Keyboard Combo',
    );
    expect(cleanHpModelName('HP 200 Black Wireless Mouse')).toBe(
      'HP 200 Wireless Mouse',
    );
    expect(cleanHpModelName('HP 235 WL Mse/KB Combo Brac (1Y4D0AA)')).toBe(
      'HP 235 Wireless Mouse and Keyboard Combo',
    );
    expect(cleanHpModelName('HP 655 WLS KB/MSE Combo WHT RUSS')).toBe(
      'HP 655 Wireless Keyboard and Mouse Combo',
    );
    expect(cleanHpModelName('HP 150 Wired Mouse/KB Combo')).toBe(
      'HP 150 Wired Mouse and Keyboard Combo',
    );
    expect(cleanHpModelName('HP USB-C G5 EsntlDk (72C71AA)')).toBe(
      'HP USB-C G5 Essential Dock',
    );
    expect(cleanHpModelName('HP USB-C Dock G5 EURO')).toBe('HP USB-C Dock G5');
    expect(cleanHpModelName('HP 3.5mm STHS G2 (428K7AA)')).toBe(
      'HP 3.5mm Stereo Headset G2',
    );
    expect(cleanHpModelName('HP Laptop / 14" (7Y2A2EA)')).toBe('HP Laptop 14"');
    expect(cleanHpModelName('Pavilion / HP OmniBook 5')).toBe('HP OmniBook 5');
    expect(cleanHpModelName('Mini PC HP 260 G9')).toBe('HP Mini PC 260 G9');
  });

  it('keeps toner color in the product name and strips printer type suffixes', () => {
    expect(
      cleanHpModelName('HP 410A Black Original LaserJet Toner Cartridge (CF410A)'),
    ).toBe('HP 410A Black Original LaserJet Toner Cartridge');
    expect(cleanHpModelName('HP LaserJet Enterprise M806dn Printer (CZ244A)')).toBe(
      'HP LaserJet Enterprise M806dn',
    );
    expect(cleanHpModelName('HP ScanJet Pro 2600 f1 Scanner (20G05A)')).toBe(
      'HP ScanJet Pro 2600 f1',
    );
    expect(cleanHpModelName('HP DeskJet Ink Advantage 2876 AIO (6W7E6C)')).toBe(
      'HP DeskJet Ink Advantage 2876',
    );
    expect(cleanHpModelName('HP Smart Tank 520 AiO (1F3W2A)')).toBe(
      'HP Smart Tank 520',
    );
    expect(cleanHpModelName('HP Color LaserJet Ent MFP M480f')).toBe(
      'HP Color LaserJet Enterprise MFP M480f',
    );
  });

  it('does not treat print mode as a catalog color', () => {
    expect(isHpCatalogColorValue('Rəngli')).toBe(false);
    expect(isHpCatalogColorValue('Ağ-qara')).toBe(false);
    expect(isHpCatalogColorValue('Mavi (Cyan)')).toBe(true);
    expect(isHpCatalogColorValue('Qara')).toBe(true);
  });

  it('does not treat monitor gamut as a catalog color', () => {
    expect(isHpCatalogColorValue('99% DCI-P3')).toBe(false);
    expect(isHpCatalogColorValue('Dark Ash Silver')).toBe(true);
  });

  it('puts only RAM storage and real color on the variant', () => {
    expect(
      buildHpVariantName([
        { label: 'Prosessor', value: 'Intel Core i5-1335U' },
        { label: 'Operativ yaddaş', value: '8GB DDR4 3200' },
        { label: 'Yaddaş', value: '256GB PCIe NVMe SSD' },
      ]),
    ).toBe('256GB PCIe NVMe SSD / 8GB DDR4 3200');

    expect(
      buildHpVariantAttributes([
        { label: 'Prosessor', value: 'Intel Core i5-1335U' },
        { label: 'Operativ yaddaş', value: '8GB DDR4 3200' },
        { label: 'Yaddaş', value: '256GB PCIe NVMe SSD' },
        { label: 'Rəng', value: 'Dark Ash Silver' },
        { label: 'Ekran', value: '15.6" FHD' },
      ]),
    ).toEqual({
      Yaddaş: '256GB PCIe NVMe SSD',
      RAM: '8GB DDR4 3200',
      Rəng: 'Dark Ash Silver',
    });

    expect(
      buildHpVariantAttributes([
        { label: 'Yaddaş', value: '64 MB' },
        { label: 'Rəng', value: 'Rəngli' },
      ]),
    ).toEqual({});

    expect(
      buildHpVariantName([
        { label: 'Rəng', value: 'Mavi (Cyan)' },
        { label: 'Tutum', value: '1300 səhifə' },
      ]),
    ).toBe('Mavi (Cyan) / 1300 səhifə');

    expect(
      buildHpVariantAttributes([
        { label: 'Rəng', value: 'Mavi (Cyan)' },
        { label: 'Tutum', value: '1300 səhifə' },
      ]),
    ).toEqual({
      Tutum: '1300 səhifə',
      Rəng: 'Mavi (Cyan)',
    });
  });

  it('stores a cleaned Model spec without SKU notes or screen slash', () => {
    expect(
      sanitizeHpRequiredSpecs([
        { label: 'Model', value: 'HP 250G10 / 15.6"' },
        { label: 'Yaddaş', value: '256GB PCIe NVMe SSD' },
      ]),
    ).toEqual([
      { label: 'Model', value: 'HP 250 G10' },
      { label: 'Yaddaş', value: '256GB PCIe NVMe SSD' },
    ]);
  });
});
