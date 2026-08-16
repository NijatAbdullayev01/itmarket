import {
  buildDellCatalogProductName,
  buildDellVariantAttributes,
  buildDellVariantName,
  cleanDellModelName,
  isDellCatalogColorValue,
  normalizeDellSku,
  sanitizeDellRequiredSpecs,
} from './dell-product-name';

describe('dell-product-name', () => {
  it('normalizes Dell part numbers', () => {
    expect(normalizeDellSku(' 210-bbru-e-2314 ')).toBe('210-BBRU-E-2314');
    expect(normalizeDellSku('per3505a')).toBe('PER3505A');
  });

  it('keeps brand-line model without CPU RAM or storage', () => {
    expect(
      buildDellCatalogProductName(
        'Dell Pro Max 14 MC14250/ U5 235H vPro/16GB DDR5/512GB SSD/14 FHD+',
        [
          { label: 'Model', value: 'Dell Pro Max 14 MC14250' },
          { label: 'Prosessor', value: 'Intel Core Ultra 5 235H vPro' },
          { label: 'RAM', value: '16 GB DDR5' },
          { label: 'Yaddaş', value: '512 GB SSD' },
        ],
      ),
    ).toBe('Dell Pro Max 14 MC14250');
  });

  it('strips SKU catalog notes from the model field', () => {
    expect(
      cleanDellModelName(
        'Alienware AW3425DWM (SKU 210-BQWL; kataloqda AW3423DWM kimi keçə bilər)',
      ),
    ).toBe('Alienware AW3425DWM');
  });

  it('keeps color language and layout out of the model name', () => {
    expect(cleanDellModelName('Dell Optical Mouse MS116 Black')).toBe(
      'Dell Optical Mouse MS116',
    );
    expect(
      cleanDellModelName('Dell Multimedia Keyboard KB216 Russian Black'),
    ).toBe('Dell Multimedia Keyboard KB216');
    expect(cleanDellModelName('Dell Pro KM5221W Russian White')).toBe(
      'Dell Pro KM5221W',
    );
    expect(cleanDellModelName('Dell Pro KM5221W Russian (RTL BOX)')).toBe(
      'Dell Pro KM5221W',
    );
    expect(cleanDellModelName('Dell Premier / Pro Plus KM7321W Russian')).toBe(
      'Dell Premier KM7321W',
    );
    expect(
      cleanDellModelName('Alienware AW920K Tri-Mode (Dark Side of the Moon)'),
    ).toBe('Alienware AW920K Tri-Mode');
    expect(cleanDellModelName('Alienware AW420K US QWERTY')).toBe(
      'Alienware AW420K',
    );
    expect(
      cleanDellModelName('Dell Mobile Wireless Mouse MS3320W Ash Pink'),
    ).toBe('Dell Mobile Wireless Mouse MS3320W');
  });

  it('falls back to the first title segment when Model spec is missing', () => {
    expect(
      buildDellCatalogProductName(
        'Dell EUR 45W AC Adapter with Power Cord (Kit)',
        [],
      ),
    ).toBe('Dell EUR 45W AC Adapter with Power Cord (Kit)');
  });

  it('does not treat monitor gamut as a catalog color', () => {
    expect(isDellCatalogColorValue('99% DCI-P3')).toBe(false);
    expect(isDellCatalogColorValue('100% sRGB, Delta E < 2')).toBe(false);
    expect(isDellCatalogColorValue('Qara')).toBe(true);
    expect(isDellCatalogColorValue('Lunar Light')).toBe(true);
  });

  it('uses PowerEdge model without chassis config and prefixes Xeon kits', () => {
    expect(
      buildDellCatalogProductName(
        'Dell PowerEdge R350 (Xeon E-2314 / 16GB / 480GB SSD)',
        [
          { label: 'Model', value: 'Dell PowerEdge R350' },
          { label: 'Part number', value: '210-BBRU-E-2314' },
        ],
      ),
    ).toBe('Dell PowerEdge R350');
    expect(
      buildDellCatalogProductName('Dell Intel Xeon Silver 4310 (338-CBXK)', [
        { label: 'Model', value: 'Intel Xeon Silver 4310' },
      ]),
    ).toBe('Dell Intel Xeon Silver 4310');
  });

  it('keeps drive and NIC titles when Model spec is abbreviated', () => {
    expect(
      buildDellCatalogProductName(
        'Dell 480GB SSD SATA Read Intensive 6Gbps 512e 2.5in Hot-Plug (345-BDZZ)',
        [{ label: 'Model', value: 'Dell 480 GB RI SSD' }],
      ),
    ).toBe(
      'Dell 480GB SSD SATA Read Intensive 6Gbps 512e 2.5in Hot-Plug',
    );
    expect(
      buildDellCatalogProductName(
        'Dell Broadcom 57412 Dual Port 10Gb SFP+ PCIe Adapter Low Profile (540-BBVL)',
        [{ label: 'Model', value: 'Broadcom 57412' }],
      ),
    ).toBe(
      'Dell Broadcom 57412 Dual Port 10Gb SFP+ PCIe Adapter Low Profile',
    );
  });

  it('puts server config RAM storage capacity and length on the variant', () => {
    expect(
      buildDellVariantName([
        { label: 'RAM (bu konfiq)', value: '16 GB DDR4 UDIMM ECC' },
        {
          label: 'Yaddaş (bu konfiq)',
          value: '1 × 480 GB SATA RI SSD',
        },
      ]),
    ).toBe('1 × 480 GB SATA RI SSD / 16 GB DDR4 UDIMM ECC');

    expect(
      buildDellVariantAttributes([
        { label: 'Tutum', value: '4 TB' },
        { label: 'İnterfeys', value: 'SAS 12 Gbps' },
      ]),
    ).toEqual({ Yaddaş: '4 TB' });

    expect(
      buildDellVariantAttributes([
        { label: 'Tutum', value: '16 GB' },
        { label: 'Rank / təşkilat', value: '2Rx8' },
        { label: 'Tip (buffered)', value: 'RDIMM' },
      ]),
    ).toEqual({ RAM: '16 GB' });

    expect(
      buildDellVariantName([{ label: 'Uzunluq', value: '5 m' }]),
    ).toBe('5 m');
  });

  it('puts only RAM storage and real color on the variant', () => {
    expect(
      buildDellVariantName([
        { label: 'Prosessor', value: 'Intel Core Ultra 5 235H vPro' },
        { label: 'RAM', value: '16 GB DDR5' },
        { label: 'Yaddaş', value: '512 GB SSD' },
      ]),
    ).toBe('512 GB SSD / 16 GB DDR5');

    expect(
      buildDellVariantAttributes([
        { label: 'Prosessor', value: 'Intel Core i7-1355U' },
        { label: 'RAM', value: '16 GB' },
        { label: 'Yaddaş', value: '512 GB SSD' },
        { label: 'Rəng', value: 'Silver' },
        { label: 'Ekran', value: '15.6" FHD' },
      ]),
    ).toEqual({
      Yaddaş: '512 GB SSD',
      RAM: '16 GB',
      Rəng: 'Silver',
    });

    expect(
      buildDellVariantAttributes(
        [{ label: 'Panel', value: 'IPS' }],
        'Dark Side of the Moon',
      ),
    ).toEqual({ Rəng: 'Dark Side of the Moon' });

    expect(
      buildDellVariantAttributes([
        { label: 'Rəng (korpus)', value: 'Qara' },
        { label: 'Diaqonal', value: '23.8"' },
      ]),
    ).toEqual({ Rəng: 'Qara' });

    expect(
      buildDellVariantAttributes([
        { label: 'Rəng tutumu', value: '100% sRGB' },
      ]),
    ).toEqual({});

    expect(
      buildDellVariantAttributes([
        {
          label: 'Rəng',
          value: '16.7 milyon; ~83% CIE 1976 / 72% NTSC',
        },
        { label: 'Rəng (korpus)', value: 'Qara' },
      ]),
    ).toEqual({ Rəng: 'Qara' });
  });

  it('stores a cleaned Model spec without SKU notes color or layout', () => {
    expect(
      sanitizeDellRequiredSpecs([
        {
          label: 'Model',
          value:
            'Alienware AW3425DWM (SKU 210-BQWL; kataloqda AW3423DWM kimi keçə bilər)',
        },
        { label: 'Panel', value: 'QD-OLED' },
        { label: 'Model', value: 'Dell Optical Mouse MS116 Black' },
      ]),
    ).toEqual([
      { label: 'Model', value: 'Alienware AW3425DWM' },
      { label: 'Panel', value: 'QD-OLED' },
      { label: 'Model', value: 'Dell Optical Mouse MS116' },
    ]);
  });
});
