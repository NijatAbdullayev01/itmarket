import {
  cleanApcMarketingTitle,
  ensureApcModelSpec,
  ensureApcPartNumberSpec,
  isApcAccessoryOpaqueName,
  isApcCompactCodeName,
  listApcAccessoryCatalogNameSkus,
  normalizeApcSku,
  preferApcMarketingTitle,
  resolveApcCatalogName,
} from './apc-product-name';

describe('apc-product-name', () => {
  it('normalizes APC SKUs', () => {
    expect(normalizeApcSku(' ap9641 ')).toBe('AP9641');
    expect(normalizeApcSku('BV1000I-GR')).toBe('BV1000I-GR');
  });

  it('detects compact UPS codes', () => {
    expect(isApcCompactCodeName('BV1000I-GR')).toBe(true);
    expect(isApcCompactCodeName('SRV10KI')).toBe(true);
    expect(isApcCompactCodeName('SRT3000RMXLI')).toBe(true);
    expect(
      isApcCompactCodeName('APC Easy UPS BV 1000VA AVR Schuko Outlet 230V'),
    ).toBe(false);
  });

  it('strips SERP junk suffixes without dropping product descriptors', () => {
    expect(
      cleanApcMarketingTitle('APC Easy UPS 1200VA 230V AVR Schuko Sockets Al'),
    ).toBe('APC Easy UPS 1200VA 230V AVR Schuko Sockets');
    expect(
      cleanApcMarketingTitle(
        'APC Back-UPS 950VA 230V AVR Schuko Sockets Modelini Al',
      ),
    ).toBe('APC Back-UPS 950VA 230V AVR Schuko Sockets');
    expect(
      cleanApcMarketingTitle(
        'APC Easy UPS On-Line SRV RM 10000VA 230V Qiyməti',
      ),
    ).toBe('APC Easy UPS On-Line SRV RM 10000VA 230V');
    expect(
      cleanApcMarketingTitle('APC Smart-UPS SRT 10000VA RM On-Line UPS Modeli'),
    ).toBe('APC Smart-UPS SRT 10000VA RM On-Line UPS');
    expect(
      cleanApcMarketingTitle('APC Smart-UPS RT 5kVA 230V On-Line UPS Al'),
    ).toBe('APC Smart-UPS RT 5kVA 230V On-Line UPS');
    expect(
      cleanApcMarketingTitle(
        'APC Smart-UPS C 1500VA LCD 230V SmartConnect Modeli',
      ),
    ).toBe('APC Smart-UPS C 1500VA LCD 230V SmartConnect');
    expect(
      cleanApcMarketingTitle('APC Easy UPS BV 1000VA AVR Schuko Outlet 230V'),
    ).toBe('APC Easy UPS BV 1000VA AVR Schuko Outlet 230V');
    expect(
      cleanApcMarketingTitle('APC Easy UPS SRV RM 6000VA 230V ,with RailKit'),
    ).toBe('APC Easy UPS SRV RM 6000VA 230V, with RailKit');
  });

  it('maps accessory PNs to marketing titles', () => {
    expect(listApcAccessoryCatalogNameSkus()).toEqual(['AP9544', 'AP9641']);
    expect(isApcAccessoryOpaqueName('AP9544')).toBe(true);
    expect(isApcAccessoryOpaqueName('BV1000I-GR')).toBe(false);
    expect(resolveApcCatalogName('AP9544', 'Network Management Card')).toBe(
      'APC AP9544 Easy UPS Network Management Card',
    );
    expect(resolveApcCatalogName('AP9641', 'NMC3')).toBe(
      'APC AP9641 Network Management Card 3',
    );
  });

  it('resolves UPS marketing titles from Excel/seo instead of bare codes', () => {
    expect(
      resolveApcCatalogName(
        'BV1000I-GR',
        'APC Easy UPS BV 1000VA AVR Schuko Outlet 230V',
      ),
    ).toBe('APC Easy UPS BV 1000VA AVR Schuko Outlet 230V');
    expect(
      resolveApcCatalogName(
        'BVX1200LI-GR',
        'APC Easy UPS 1200VA 230V AVR Schuko Sockets Al',
      ),
    ).toBe('APC Easy UPS 1200VA 230V AVR Schuko Sockets');
    expect(
      resolveApcCatalogName(
        'BX950MI-GR',
        'APC Back-UPS 950VA 230V AVR Schuko Sockets Modelini Al',
      ),
    ).toBe('APC Back-UPS 950VA 230V AVR Schuko Sockets');
    expect(
      resolveApcCatalogName('SRV10KI', 'APC Easy UPS 10000VA 230V On-Line UPS'),
    ).toBe('APC Easy UPS 10000VA 230V On-Line UPS');
    expect(
      preferApcMarketingTitle(
        'APC Easy UPS BV 1000VA AVR Schuko Outlet 230V',
        'BV1000I-GR',
      ),
    ).toBe('APC Easy UPS BV 1000VA AVR Schuko Outlet 230V');
  });

  it('ensures Part number and Model on specs', () => {
    expect(
      ensureApcPartNumberSpec(
        [{ label: 'Şəbəkə', value: 'Gigabit Ethernet' }],
        'AP9641',
      ),
    ).toEqual([
      { label: 'Part number', value: 'AP9641' },
      { label: 'Şəbəkə', value: 'Gigabit Ethernet' },
    ]);
    expect(
      ensureApcModelSpec([{ label: 'Güc', value: '1000 VA' }], 'BV1000I-GR'),
    ).toEqual([
      { label: 'Model', value: 'BV1000I-GR' },
      { label: 'Güc', value: '1000 VA' },
    ]);
  });
});
