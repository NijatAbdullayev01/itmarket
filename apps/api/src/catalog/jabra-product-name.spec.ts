import {
  jabraDisplayModel,
  normalizeJabraSku,
  resolveJabraCatalogName,
} from './jabra-product-name';

describe('jabra-product-name', () => {
  it('normalizes Excel model codes into unique SKUs', () => {
    expect(normalizeJabraSku('204151/box')).toBe('204151-BOX');
    expect(normalizeJabraSku('20797-999-889/box')).toBe('20797-999-889-BOX');
    expect(normalizeJabraSku('1519-0154')).toBe('1519-0154');
    expect(normalizeJabraSku(' 230-09 ')).toBe('230-09');

    const models = [
      '204151/box',
      '20797-999-889',
      '20797-999-889/box',
      '1519-0154',
      '1559-0159',
      '8200-231',
      '14202-11',
    ];
    const skus = models.map(normalizeJabraSku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it('keeps marketing model and short type without datasheet clauses', () => {
    expect(
      resolveJabraCatalogName('204151/box', 'BlueParrott C400-XT', {
        subcategorySlug: 'qulaqliq',
        specs: [{ label: 'Tip', value: 'Bluetooth headset (BlueParrott / Jabra)' }],
      }),
    ).toBe('Jabra BlueParrott C400-XT Bluetooth qulaqlıq');
    expect(
      resolveJabraCatalogName(
        '1519-0154',
        'Jabra BIZ 1500 Duo, QD, NC, EMEA',
        {
          subcategorySlug: 'qulaqliq',
          specs: [
            { label: 'Tip', value: 'Wired call-center headset' },
            { label: 'Forma', value: 'Duo (stereo / iki qulaq)' },
            { label: 'Bağlantı', value: 'QD (Quick Disconnect)' },
          ],
        },
      ),
    ).toBe('Jabra BIZ 1500 Duo QD qulaqlıq');
    expect(
      resolveJabraCatalogName(
        '1559-0159',
        'Jabra BIZ 1500 Duo, USB, NC, Global',
        {
          subcategorySlug: 'qulaqliq',
          specs: [
            { label: 'Tip', value: 'Wired call-center headset' },
            { label: 'Forma', value: 'Duo (stereo / iki qulaq)' },
            { label: 'Bağlantı', value: 'USB' },
          ],
        },
      ),
    ).toBe('Jabra BIZ 1500 Duo USB qulaqlıq');
    expect(
      resolveJabraCatalogName(
        '9559-583-111',
        'Jabra Engage 75 Stereo, EMEA',
        {
          subcategorySlug: 'qulaqliq',
          specs: [{ label: 'Tip', value: 'Professional wireless DECT headset' }],
        },
      ),
    ).toBe('Jabra Engage 75 Stereo DECT qulaqlıq');
    expect(
      resolveJabraCatalogName(
        '4999-823-169',
        'Jabra Evolve 20, USB C/A, MS Stereo',
        {
          subcategorySlug: 'qulaqliq',
          specs: [
            { label: 'Tip', value: 'Wired stereo headset' },
            { label: 'Bağlantı', value: 'USB-C / USB-A' },
          ],
        },
      ),
    ).toBe('Jabra Evolve 20 Stereo USB qulaqlıq');
    expect(
      resolveJabraCatalogName(
        '26699-999-999',
        'Jabra Evolve2 65 Flex Link380a MS Stereo',
        {
          subcategorySlug: 'qulaqliq',
          specs: [{ label: 'Tip', value: 'Foldable wireless stereo headset' }],
        },
      ),
    ).toBe('Jabra Evolve2 65 Flex Stereo simsiz qulaqlıq');
    expect(
      resolveJabraCatalogName(
        '28599-999-889',
        'Jabra Evolve2 85, Link380c MS Stereo Stand Black',
        {
          subcategorySlug: 'qulaqliq',
          specs: [
            {
              label: 'Tip',
              value: 'Premium wireless stereo headset + charging stand',
            },
          ],
        },
      ),
    ).toBe('Jabra Evolve2 85 Stereo stendli qulaqlıq');
    expect(
      resolveJabraCatalogName(
        '20797-999-889',
        'Jabra Evolve2 Buds, USB-C MS - Wireless Charging Pad',
        {
          subcategorySlug: 'qulaqliq',
          specs: [{ label: 'Tip', value: 'True wireless earbuds (UC)' }],
        },
      ),
    ).toBe('Jabra Evolve2 Buds qulaqlıq');
    expect(
      resolveJabraCatalogName(
        '20797-999-889/box',
        'Jabra Evolve2 Buds, USB-C MS - Wireless Charging Pad packaging is damaged',
        {
          subcategorySlug: 'qulaqliq',
          specs: [{ label: 'Tip', value: 'True wireless earbuds (UC)' }],
        },
      ),
    ).toBe('Jabra Evolve2 Buds (zədələnmiş qutu) qulaqlıq');
    expect(
      resolveJabraCatalogName('14101-45', 'Foam Ear Cushion, EVOLVE 20-65', {
        subcategorySlug: 'qulaqliq-aksesuarlari',
        specs: [{ label: 'Tip', value: 'Ehtiyat foam (köpük) qulaqlıq yastığı' }],
      }),
    ).toBe('Jabra Evolve 20-65 foam yastıq');
    expect(
      resolveJabraCatalogName('88011-99', 'GN 1200 CC', {
        subcategorySlug: 'qulaqliq-aksesuarlari',
        specs: [{ label: 'Tip', value: 'Universal telephone headset kabeli / cord' }],
      }),
    ).toBe('Jabra GN 1200 CC headset kabeli');
    expect(
      resolveJabraCatalogName('230-09', 'Jabra LINK 230', {
        subcategorySlug: 'qulaqliq-aksesuarlari',
        specs: [{ label: 'Tip', value: 'USB adapter / link' }],
      }),
    ).toBe('Jabra LINK 230 USB adapter');
    expect(
      resolveJabraCatalogName('2755-109', 'Jabra Speak2 55, MS Teams', {
        subcategorySlug: 'konfrans-dinamiki',
        specs: [{ label: 'Tip', value: 'Portable speakerphone' }],
      }),
    ).toBe('Jabra Speak2 55 konfrans dinamiki');
    expect(
      resolveJabraCatalogName('8200-231', 'Jabra PanaCast 50, EMEA, Black', {
        subcategorySlug: 'konfrans-kamerasi',
        specs: [
          { label: 'Tip', value: 'Intelligent video bar / conferencing camera' },
        ],
      }),
    ).toBe('Jabra PanaCast 50 konfrans kamerası');
    expect(
      resolveJabraCatalogName('8220-209', 'Jabra PanaCast 50 Remote, Black', {
        subcategorySlug: 'konfrans-kamera-aksesuarlari',
        specs: [{ label: 'Tip', value: 'Remote control aksesuarı' }],
      }),
    ).toBe('Jabra PanaCast 50 Remote pult');
    expect(
      resolveJabraCatalogName(
        '14202-11',
        'Jabra PanaCast USB Cable, USB 2.0, 5m, USB-C to USB-A',
        {
          subcategorySlug: 'konfrans-kamera-aksesuarlari',
          specs: [{ label: 'Tip', value: 'USB kabel' }],
        },
      ),
    ).toBe('Jabra PanaCast USB kabel 5m');
    expect(
      resolveJabraCatalogName(
        '14207-70',
        'Jabra PanaCast 50 Table Stand, Black',
        {
          subcategorySlug: 'konfrans-kamera-aksesuarlari',
          specs: [{ label: 'Tip', value: 'Table stand (masa dayaqı)' }],
        },
      ),
    ).toBe('Jabra PanaCast 50 masa dayaqı');
    expect(
      jabraDisplayModel('Jabra Evolve3 75, MS, Link390a, Black', [
        { label: 'Tip', value: 'Wireless stereo headset (Evolve3)' },
      ]),
    ).toBe('Evolve3 75 Stereo');
  });
});
