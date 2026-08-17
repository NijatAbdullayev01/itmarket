import {
  applyTitleLengthToSpecs,
  colorFromTitle,
  ensureUgreenModelSpec,
  isUgreenCompactCodeName,
  lengthFromTitle,
  normalizeUgreenSku,
  preferUgreenMarketingTitle,
  resolveUgreenCatalogName,
} from './ugreen-product-name';

describe('ugreen-product-name', () => {
  it('detects compact manufacturer codes and prefers marketing titles', () => {
    expect(isUgreenCompactCodeName('HD104')).toBe(true);
    expect(isUgreenCompactCodeName('CD361')).toBe(true);
    expect(isUgreenCompactCodeName('20265')).toBe(true);
    expect(isUgreenCompactCodeName('UGREEN HDMI 4K kabel 2 m qara')).toBe(
      false,
    );
    expect(
      preferUgreenMarketingTitle('UGREEN HDMI 4K kabel 2 m qara', 'HD104'),
    ).toBe('UGREEN HDMI 4K kabel 2 m qara');
    expect(
      preferUgreenMarketingTitle('', 'UGREEN HDMI 4K kabel 2 m qara'),
    ).toBe('UGREEN HDMI 4K kabel 2 m qara');
    expect(
      ensureUgreenModelSpec([{ label: 'Tip', value: 'HDMI' }], 'HD104'),
    ).toEqual([
      { label: 'Model', value: 'HD104' },
      { label: 'Tip', value: 'HDMI' },
    ]);
  });

  it('uses marketingTitle when the fallback is only a compact code', () => {
    expect(
      resolveUgreenCatalogName('HD104', 'HD104', {
        subcategorySlug: 'hdmi-kabel',
        marketingTitle: 'UGREEN HDMI 4K Cable Male to Male Black 2m',
      }),
    ).toBe('UGREEN HDMI 4K kabel 2 m qara');
  });
  it('normalizes Excel SKU codes into unique catalog SKUs', () => {
    expect(normalizeUgreenSku('25685B')).toBe('25685B');
    expect(normalizeUgreenSku(' 20519EU ')).toBe('20519EU');
    expect(normalizeUgreenSku('50633a')).toBe('50633A');
    expect(normalizeUgreenSku('55989B')).toBe('55989B');

    const skus = ['25685B', '35291', '20503', '20519EU', '50633A', '10107'];
    expect(new Set(skus.map(normalizeUgreenSku)).size).toBe(skus.length);
  });

  it('reads colour and cable length from the marketing title', () => {
    expect(colorFromTitle('UGREEN 20W 1C GaN Fast Charger Gray')).toBe('boz');
    expect(
      colorFromTitle('UGREEN Uno RG 65W 3-Port GaN Fast Charger EU Purple'),
    ).toBe('bənövşəyi');
    expect(
      colorFromTitle('UGREEN Uno RG 65W 3-Port GaN Fast Charger Pink Blue EU'),
    ).toBe('çəhrayı-göy');
    expect(lengthFromTitle('UGREEN HDMI 4K Cable Male to Male Black 2m')).toBe(
      '2 m',
    );
    expect(
      lengthFromTitle(
        'UGREEN USB-C to 3.5mm M/F Cable Aluminum Shell with Braided 10cm (Space Gray)',
      ),
    ).toBe('10 sm');
  });

  it('overlays title length onto copied Icecat specs', () => {
    const specs = applyTitleLengthToSpecs(
      'UGREEN HDMI 4K Cable Male to Male Black 2m',
      [{ label: 'Uzunluq', value: '10 m' }],
    );
    expect(specs).toEqual([{ label: 'Uzunluq', value: '2 m' }]);
  });

  it('keeps marketing series and short type without datasheet clauses', () => {
    expect(
      resolveUgreenCatalogName(
        '25685B',
        'UGREEN Uno RG 65W 3-Port GaN Fast Charger EU',
        { subcategorySlug: 'sarj-cihazi' },
      ),
    ).toBe('UGREEN Uno RG 65W GaN 3-port şarj cihazı');
    expect(
      resolveUgreenCatalogName(
        '35291',
        'UGREEN Uno RG 65W 3-Port GaN Fast Charger EU Purple',
        { subcategorySlug: 'sarj-cihazi' },
      ),
    ).toBe('UGREEN Uno RG 65W GaN 3-port şarj cihazı bənövşəyi');
    expect(
      resolveUgreenCatalogName(
        '35855',
        'UGREEN Uno RG 65W 3-Port GaN Fast Charger Pink Blue EU',
        { subcategorySlug: 'sarj-cihazi' },
      ),
    ).toBe('UGREEN Uno RG 65W GaN 3-port şarj cihazı çəhrayı-göy');
    expect(
      resolveUgreenCatalogName('55528', 'UGREEN 20W 1C GaN Fast Charger Gray', {
        subcategorySlug: 'sarj-cihazi',
      }),
    ).toBe('UGREEN 20W GaN şarj cihazı boz');
    expect(
      resolveUgreenCatalogName(
        '25874',
        'UGREEN Nexode Pro 100W 3-Port GaN Fast Charger Set EU',
        { subcategorySlug: 'sarj-cihazi' },
      ),
    ).toBe('UGREEN Nexode Pro 100W GaN 3-port şarj dəsti');
    expect(
      resolveUgreenCatalogName(
        '25188',
        'UGREEN 20000mAh Two-way Fast Charging Power Bank',
        { subcategorySlug: 'powerbank' },
      ),
    ).toBe('UGREEN 20000mAh powerbank');
    expect(
      resolveUgreenCatalogName(
        '35605B',
        'UGREEN 5000mAh Magnetic Wireless Power Bank Gray',
        {
          subcategorySlug: 'powerbank',
          specs: [{ label: 'Model', value: 'PB571' }],
        },
      ),
    ).toBe('UGREEN PB571 5000mAh maqnit powerbank boz');
    expect(
      resolveUgreenCatalogName(
        '65905',
        'UGREEN USB-C to USB-C 100W PD Fast Charging Retractable Cable',
        { subcategorySlug: 'usb-kabel' },
      ),
    ).toBe('UGREEN USB-C - USB-C 100W yığılan kabel');
    expect(
      resolveUgreenCatalogName(
        '70429',
        'UGREEN USB-C to USB-C PD Fast Charging Cable 5A Max Black 2m',
        {
          subcategorySlug: 'usb-kabel',
          specs: [{ label: 'Uzunluq', value: '1 m' }],
        },
      ),
    ).toBe('UGREEN USB-C - USB-C kabel 2 m qara');
    expect(
      resolveUgreenCatalogName(
        '10107',
        'UGREEN HDMI 4K Cable Male to Male Black 2m',
        {
          subcategorySlug: 'hdmi-kabel',
          specs: [{ label: 'Uzunluq', value: '10 m' }],
        },
      ),
    ).toBe('UGREEN HDMI 4K kabel 2 m qara');
    expect(
      resolveUgreenCatalogName(
        '20165',
        'UGREEN Cat 6 U/UTP Lan Cable 15m (Black)',
        {
          subcategorySlug: 'sebeke-aksesuarlari',
          specs: [{ label: 'Uzunluq', value: '1 m' }],
        },
      ),
    ).toBe('UGREEN Cat 6 LAN kabel 15 m qara');
    expect(
      resolveUgreenCatalogName(
        '35757',
        'UGREEN HiTune Max5c Hybrid Active Noise-Cancelling Headphones Black',
        { subcategorySlug: 'qulaqliq' },
      ),
    ).toBe('UGREEN HiTune Max5c ANC qulaqlıq qara');
    expect(
      resolveUgreenCatalogName('45000', 'UGREEN 6-in-1 USB-C Hub', {
        subcategorySlug: 'dok-stansiya',
      }),
    ).toBe('UGREEN 6-in-1 USB-C hub');
    expect(
      resolveUgreenCatalogName('15598', 'UGREEN USB-C Multifunction Adapter', {
        subcategorySlug: 'dok-stansiya',
        specs: [{ label: 'Model', value: 'CM512' }],
      }),
    ).toBe('UGREEN CM512 USB-C dok stansiyası');
    expect(
      resolveUgreenCatalogName(
        '45025',
        'UGREEN 3-in-1 Magnetic Wireless Charger EU',
        {
          subcategorySlug: 'simsiz-sarj',
          specs: [{ label: 'Model', value: 'W707' }],
        },
      ),
    ).toBe('UGREEN W707 3-in-1 maqnit simsiz şarj');
    expect(
      resolveUgreenCatalogName(
        '90545',
        'UGREEN Ergonomic Wireless Mouse 2.4G 4000DPI Silence Design',
        {
          subcategorySlug: 'sican',
        },
      ),
    ).toBe('UGREEN erqonomik simsiz siçan');
    expect(
      resolveUgreenCatalogName(
        '40363',
        'UGREEN DisplayPort to HDMI Female Converter 4K*2K',
        { subcategorySlug: 'video-adapter' },
      ),
    ).toBe('UGREEN DisplayPort - HDMI 4K adapter');
    expect(
      resolveUgreenCatalogName(
        '30768',
        'UGREEN 2 In 4 Out USB 3.0 Sharing Switch Box',
        { subcategorySlug: 'usb-switch' },
      ),
    ).toBe('UGREEN 2-in-4 USB 3.0 switch');
  });
});
