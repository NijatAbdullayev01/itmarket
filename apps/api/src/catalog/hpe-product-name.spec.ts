import {
  buildHpeCatalogProductName,
  buildHpeVariantAttributes,
  buildHpeVariantName,
  cleanHpeModelName,
  normalizeHpeSku,
  sanitizeHpeRequiredSpecs,
} from './hpe-product-name';

describe('hpe-product-name', () => {
  it('normalizes HPE part numbers', () => {
    expect(normalizeHpeSku(' p22094-421 ')).toBe('P22094-421');
    expect(normalizeHpeSku('s2p33a')).toBe('S2P33A');
  });

  it('keeps ProLiant family without chassis config', () => {
    expect(
      buildHpeCatalogProductName(
        'HPE ProLiant DL380 Gen10 Plus 8SFF NC 4314 32GB Svr (P55280-421)',
        [
          { label: 'Model', value: 'HPE ProLiant DL380 Gen10 Plus' },
          {
            label: 'Prosessor',
            value: '1 × Intel Xeon Silver 4314',
          },
          {
            label: 'Yaddaş',
            value: '32 GB (1×32 GB) DDR4-3200 RDIMM; 32 DIMM, maks. 2 TB',
          },
        ],
      ),
    ).toBe('HPE ProLiant DL380 Gen10 Plus');
    expect(
      buildHpeCatalogProductName(
        'HPE ProLiant ML350 Gen10 8SFF 4208 16GB Svr (P22094-421)',
        [{ label: 'Model', value: 'HPE ProLiant ML350 Gen10' }],
      ),
    ).toBe('HPE ProLiant ML350 Gen10');
    expect(
      buildHpeCatalogProductName(
        'HPE ProLiant DL20 Gen11 4SFF 6333P 32GB 2x480GB Svr (P87466-425)',
        [{ label: 'Model', value: 'HPE ProLiant DL20 Gen11' }],
      ),
    ).toBe('HPE ProLiant DL20 Gen11');
    expect(
      buildHpeCatalogProductName(
        'HPE ProLiant DL360 Gen10 Plus 8SFF NC CTO Server (P28948-B21)',
        [
          {
            label: 'Model',
            value: 'HPE ProLiant DL360 Gen10 Plus 8SFF NC CTO',
          },
        ],
      ),
    ).toBe('HPE ProLiant DL360 Gen10 Plus');
    expect(
      buildHpeCatalogProductName(
        'HPE ProLiant DL380 Gen10 Plus Standard Heat Sink Kit (P37034-B21)',
        [],
      ),
    ).toBe('HPE ProLiant DL380 Gen10 Plus Standard Heat Sink Kit');
    expect(
      buildHpeCatalogProductName(
        'HPE ProLiant ML30 Gen11 Front PCI Fan and Baffle Kit (P65106-B21)',
        [],
      ),
    ).toBe('HPE ProLiant ML30 Gen11 Front PCI Fan and Baffle Kit');
  });

  it('prefixes Xeon kits and keeps option titles when Model is abbreviated', () => {
    expect(
      buildHpeCatalogProductName('Intel Xeon Gold 6334 Processor for HPE', [
        { label: 'Tam ad', value: 'Intel Xeon Gold 6334 Processor for HPE' },
      ]),
    ).toBe('HPE Intel Xeon Gold 6334');
    expect(
      buildHpeCatalogProductName(
        'Broadcom BCM57412 Ethernet 10Gb 2-port SFP+ OCP3 Adapter for HPE (P26256-B21)',
        [{ label: 'Model', value: 'Broadcom BCM57412' }],
      ),
    ).toBe('HPE Broadcom BCM57412 Ethernet 10Gb 2-port SFP+ OCP3 Adapter');
  });

  it('converts a leading HP prefix to HPE without doubling the brand', () => {
    expect(cleanHpeModelName('HP ProLiant DL380 Gen10 Plus')).toBe(
      'HPE ProLiant DL380 Gen10 Plus',
    );
    expect(cleanHpeModelName('HPE 16GB 2Rx8 PC4-3200AA-R Smart Kit')).toBe(
      'HPE 16GB 2Rx8 PC4-3200AA-R Smart Kit',
    );
    expect(
      buildHpeCatalogProductName(
        'HPE P38995-B21 800W Flex Slot Platinum Hot Plug Power Supply Kit',
        [{ label: 'Part number', value: 'P38995-B21' }],
      ),
    ).toBe('HPE 800W Flex Slot Platinum Hot Plug Power Supply Kit');
  });

  it('sanitizes Model specs to the compact catalog name', () => {
    expect(
      sanitizeHpeRequiredSpecs([
        {
          label: 'Model',
          value: 'HPE ProLiant DL360 Gen10 Plus 8SFF NC CTO (P28948-B21)',
        },
      ]),
    ).toEqual([{ label: 'Model', value: 'HPE ProLiant DL360 Gen10 Plus' }]);
  });

  it('puts server config RAM storage capacity and length on the variant', () => {
    expect(
      buildHpeVariantName([
        {
          label: 'Yaddaş',
          value: '16 GB (1×16 GB) DDR4-2933 RDIMM',
        },
        {
          label: 'Saxlama',
          value: '2 × 480 GB SATA RI SFF BC SSD',
        },
      ]),
    ).toBe('2 × 480 GB SATA RI SFF BC SSD / 16 GB (1×16 GB) DDR4-2933 RDIMM');

    expect(
      buildHpeVariantAttributes([
        { label: 'Tutum', value: '4 TB' },
        { label: 'İnterfeys', value: 'SAS 12 Gbps' },
      ]),
    ).toEqual({ Yaddaş: '4 TB' });

    expect(
      buildHpeVariantAttributes([
        { label: 'Tutum', value: '16 GB' },
        { label: 'Tip (buffered)', value: 'RDIMM' },
      ]),
    ).toEqual({ RAM: '16 GB' });

    expect(
      buildHpeVariantAttributes([
        { label: 'Yaddaş', value: '16 GB' },
        { label: 'Yaddaş tipi', value: 'DDR4' },
        { label: 'Rank', value: '1' },
      ]),
    ).toEqual({ RAM: '16 GB' });

    expect(
      buildHpeVariantAttributes([
        { label: 'SSD tutumu', value: '240 GB' },
        { label: 'İnterfeys', value: 'SATA' },
      ]),
    ).toEqual({ Yaddaş: '240 GB' });

    expect(buildHpeVariantName([{ label: 'Uzunluq', value: '5 m' }])).toBe(
      '5 m',
    );

    expect(
      buildHpeVariantName([
        { label: 'Yaddaş', value: 'DDR4-3200, 8 kanal' },
        { label: 'TDP', value: '165 W' },
        { label: 'Tezlik', value: '3.60 GHz' },
      ]),
    ).toBe('Standart');
  });
});
