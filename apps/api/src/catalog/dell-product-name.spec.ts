import {
  buildDellCatalogProductName,
  buildDellVariantAttributes,
  buildDellVariantName,
  cleanDellModelName,
  isDellCatalogColorValue,
  sanitizeDellRequiredSpecs,
} from './dell-product-name';

describe('dell-product-name', () => {
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
