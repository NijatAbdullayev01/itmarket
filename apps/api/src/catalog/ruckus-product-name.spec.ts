import {
  normalizeRuckusSku,
  resolveRuckusCatalogName,
  ruckusDisplayModel,
} from './ruckus-product-name';

describe('ruckus-product-name', () => {
  it('normalizes Excel model codes into unique SKUs', () => {
    expect(normalizeRuckusSku('901-R350-WW02')).toBe('901-R350-WW02');
    expect(normalizeRuckusSku('901-R550-WW00')).toBe('901-R550-WW00');
    expect(normalizeRuckusSku('901-R770-WW00/demo')).toBe('901-R770-WW00-DEMO');

    const models = ['901-R350-WW02', '901-R550-WW00', '901-R770-WW00/demo'];
    const skus = models.map(normalizeRuckusSku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it('uses the marketing model, not the BOM code, in the catalog title', () => {
    expect(
      resolveRuckusCatalogName(
        '901-R350-WW02',
        'R350 ww dual band 11ax indoor AP 2x2:2',
        {
          subcategorySlug: 'access-point',
          specs: [
            {
              label: 'Tip',
              value: 'Indoor Wi-Fi 6 (802.11ax) Access Point',
            },
          ],
        },
      ),
    ).toBe('Ruckus R350 Wi-Fi 6 Access Point');
    expect(
      resolveRuckusCatalogName(
        '901-R550-WW00',
        'R550-xx 11ax Indoor 2x2:2 AP Plenum',
        {
          subcategorySlug: 'access-point',
          specs: [
            {
              label: 'Tip',
              value:
                'Indoor Wi-Fi 6 (802.11ax) Access Point (mid-range / dense)',
            },
          ],
        },
      ),
    ).toBe('Ruckus R550 Wi-Fi 6 Access Point');
    expect(
      resolveRuckusCatalogName(
        '901-R770-WW00/demo',
        'R770 Wi-Fi 7 Indoor AP 2x2+4x4+2x2 WW Demo',
        {
          subcategorySlug: 'access-point',
          specs: [
            {
              label: 'Tip',
              value:
                'Indoor Wi-Fi 7 (802.11be) Tri-Radio Access Point · Demo SKU',
            },
          ],
        },
      ),
    ).toBe('Ruckus R770 Wi-Fi 7 Access Point');
  });

  it('extracts the R-series marketing model from the SKU', () => {
    expect(ruckusDisplayModel('901-R350-WW02', 'indoor AP')).toBe('R350');
    expect(ruckusDisplayModel('901-R770-WW00-DEMO', 'Wi-Fi 7 AP')).toBe('R770');
  });
});
