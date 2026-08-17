import {
  listTwoECatalogNameSkus,
  normalizeTwoESku,
  resolveTwoECatalogName,
  twoeSkuForGenerator,
} from './twoe-product-name';

export const TWOE_EXCEL_RAW_SKUS = [
  "2E-MF2020WC",
  "2E-MF210WB",
  "2E-MF210WW",
  "2E-MF218WBG",
  "2E-MF225WBK",
  "2E-MF211WR",
  "2E-MF211WB",
  "2E-MF300WBK",
  "2E-MF270WBK",
  "2E-MF2020WB",
  "2E-MF220WW",
  "2E-MF250WBL",
  "2E-MF300WCAPIBARAGN",
  "2E-MF300WFLORABL",
  "2E-MF300WPETSBL",
  "2E-MF300WPETSGN",
  "2E-MF300WBL",
  "2E-MF300WYW",
  "2E-MF300WGN",
  "2E-MF300WFLORAGN",
  "2E-MF300WFLORAYW",
  "2E-MF300WPETSYW",
  "2E-MF300WCAPIBARAYW",
  "2E-MF300WCAPIBARABL",
  "2E-MF325WBK",
  "2E-MG360UB-WL",
  "2E-MF270WWH",
  "2E-MF211WC",
  "2E-MF213WB",
  "2E-MF250WBK",
  "2E-MF220WB",
  "2E-MG350UB-WL",
  "2E-MG315UBK",
  "2E-MG315UWT",
  "2E-MG315UYW",
  "2E-MG355UBK-WL",
  "2E-MG355UWT-WL",
  "2E-MG355UPK-WL",
  "2E-MG355UYW-WL",
  "2E-MF140UB",
  "2E-MF150UB",
  "2E-MF160UB",
  "2E-MF170UB",
  "2E-MF180UB",
  "2E-MF110UW",
  "2E-MF1012UB",
  "2E-MF110UB",
  "2E-MF130UB",
  "2E-KS280WBGR_AK",
  "2E-KS250WBK_UA",
  "2E-KS240WG_UA",
  "2E-KS260WWH",
  "2E-KS260WB_CI",
  "2E-KS270WBGR",
  "2E-KS270WBWH",
  "2E-KS270WBGR_UA",
  "2E-MK410MWB",
  "2E-MK420WB",
  "2E-MK440WBGR_UA",
  "2E-KT100WB_UA",
  "2E-KS120UB",
  "2E-KS108UB_UA",
  "2E-KS120UB_UA",
  "2E-KG325UB",
  "2E-MK405UBK_UA",
  "2E-MK401UB_UA",
  "2E-KG330UBK",
  "2E-KG315UBK_AK",
  "2E-KG350UBK",
  "2E-SPEED-3XL-BK-PRO",
  "2E-CONTROL-3XL-BK-PRO",
  "2E-CONTROL-M-BK-PRO",
  "2E-PAD-S-CAPY-YELLOW",
  "2E-PAD-S-CAPY-BLUE",
  "2E-PAD-L-CAPY-YELLOW",
  "2E-PAD-L-CAPY-BLUE",
  "2E-SPEED-XL-YW-PRO",
  "2E-SPEED-XL-PK-PRO",
  "2E-SPEED-M-BK-PRO",
  "2E-SPEED-XL-D02-PRO",
  "2E-SPEED-XL-D04-PRO",
  "2E-SPEED-XL-D05-PRO",
  "2E-SPEED-XL-D06-PRO",
  "2E-SPEED-XL-D07-PRO",
  "2E-SPEED-XL-D08-PRO",
  "2E-HG310V2-WT",
  "2E-HG315WT-7.1",
  "2E-HG330WT-7.1",
  "2E-HG340YW",
  "2E-HG300BK",
  "2E-HG315YW-7.1",
  "2E-HG340YW-7.1",
  "2E-HG340BK",
  "2E-HG340BK-7.1",
  "2E-HG350BK-7.1",
  "2E-HG355WT-7.1",
  "2E-HG355BK-7.1",
  "2E-HG365WT-WL",
  "2E-HG365BK-WL",
  "2E-CH13SU",
  "2E-GLS310BK-KIT",
  "2E-DL2240",
  "2E-DL2236",
  "2E-DL007BK",
  "2E-SPRT-VGA",
  "2E-CPG-005",
  "2E-CPG-006",
  "2E-TMX03",
  "2E-TMX04",
  "2E-ED850",
  "2E-ED1500",
  "2E-ED1200",
  "2E-ED2000",
  "2E-ED650",
  "2E-OD2000RT",
  "2E-OD3000RT",
  "2E-GC-BUS-GR",
  "2E-GC-BUS-WELG",
  "2E-GC-BUS-ESBK",
  "2E-GC-BUS-ESGY",
  "2E-GC-BUS-ESGN",
  "2E-GC-BUS-WT",
  "2E-GC-BUS-BK",
  "2E-GC-HIB-BKRD",
  "2E-GC-BAS-BKRD",
  "2E-GC-HIB-BK",
  "2E-GC-HEB-BKWT",
  "2E-GC-HEB-BK",
  "2E-GT-OTO-BKBL",
  "2E-GT-OTO-WTGR",
  "2E-GT-OTO-BKRD",
  "2E-BPN6017BK",
  "2E-BPN6316BK",
  "2E-CBN5217BK",
  "2E-CBN315DO",
  "2E-CBN317DO",
  "2E-CBN617BK",
  "2E-CBN816BU",
  "2E-CBN315BG",
  "2E-CBT6814BK",
  "2E-BPN9004BK",
  "2E-CBN413BK",
  "2E-CBT6817BK",
  "2E-CBN9198BK",
  "2E-CBN5216BK",
  "2E-CBN417BK",
  "2E-CBN5214BK",
  "2E-CBN9265BK",
  "2E-R2723BV-01.UA",
  "2E-B2425B-01.EU",
  "2E-D2425B-01.EU",
  "2E-F2425B-01.EU",
  "2E-F2725B-01.EU",
  "2E-N2723B-01.UA",
  "2E-L2825B-01.UA",
  "2EDGEIF",
  "2E-1MCBUSB",
  "2EDGEREDUSB",
  "2EDGEIFUSB",
  "2EDGERED",
  "2EDGEIF2",
  "2ECO1MON",
  "2E-S-509CC",
  "2E-S-1015CD",
  "2E-ML010",
  "2E-ML020",
  "2E-MG010",
  "2E-MPC110",
  "2E-MPC020",
  "2E-MM011_OLD",
  "2E-MM011",
  "2E-PCS231BK",
  "2E-PCS101BK",
  "2E-PCS233BK",
  "2E-PCS202BK",
  "2E-PCS203BK",
  "2E-PCS234BK",
  "2E-BSSLMWBK",
  "2E-BSSLMWBN",
  "2E-BSSLMWGN",
  "2E-BSSLWBK",
  "2E-BSSLWBN",
  "2E-BSSXPWRD",
  "2E-BSSXPLLWBK",
  "2E-BSSXT2WBK",
  "2E-32A07B",
  "2E-43A07B",
  "2E2GEN2343TILT",
  "2E2GEN3270FIX",
  "2EMAGSLIM",
  "2E2GEN800.50.100",
  "2ECARTVCS",
  "2E-U03VES5MBK",
  "2E-AD120U",
  "2E-SP515OSM3WH",
  "2E-SP515M5BK",
  "2E-U05VESM3BK",
  "2E-AD0103WH",
  "2E-AD0103BK",
  "2E-U05ES15M10WH",
  "2E-SP515M2USBWH",
  "2E-SP515M2USBBK",
  "2EW-2684",
  "2E-SK100WST",
  "2E-SK7IN1",
  "2E-SK3IN1",
  "2E-SK150GR",
  "2E-SK150BL",
  "2E-SK140PN",
  "2E-SK140BL",
] as const;

describe('twoe-product-name', () => {
  it('normalizes Excel part numbers into unique SKUs', () => {
    expect(normalizeTwoESku(' 2E-MF210WB ')).toBe('2E-MF210WB');
    expect(normalizeTwoESku('2E-R2723BV-01.UA')).toBe('2E-R2723BV-01.UA');
    expect(normalizeTwoESku('2EDGEIF2')).toBe('2EDGEIF2');

    const normalized = TWOE_EXCEL_RAW_SKUS.map(normalizeTwoESku);
    expect(new Set(normalized).size).toBe(normalized.length);
    expect(normalized).toEqual(
      expect.arrayContaining(listTwoECatalogNameSkus()),
    );
  });

  it('covers every 2e.xlsx SKU with a catalog title', () => {
    expect(listTwoECatalogNameSkus().sort()).toEqual(
      [...TWOE_EXCEL_RAW_SKUS].map(normalizeTwoESku).sort(),
    );
    expect(listTwoECatalogNameSkus()).toHaveLength(210);
  });

  it('keeps brand, model and type without datasheet clauses', () => {
    expect(resolveTwoECatalogName('2E-MF210WB', 'fallback')).toBe(
      "2E MF210 qara simsiz siçan",
    );
    expect(resolveTwoECatalogName('2E-MF270WBK', 'fallback')).toBe(
      "2E MF270 doldurulan qara simsiz siçan",
    );
    expect(resolveTwoECatalogName('2E-SPEED-XL-D04-PRO', 'fallback')).toBe(
      "2E Gaming PRO Speed D04 XL (800x450x3mm) çokrəngli oyun siçan altlığı",
    );
    expect(resolveTwoECatalogName('2E-GC-BUS-ESBK', 'fallback')).toBe(
      "2E Gaming BUSHIDO Lite qara oyun kreslosu",
    );
    expect(resolveTwoECatalogName('2E-ED850', 'fallback')).toBe(
      "2E ED850 850VA/480W 2xSchuko UPS",
    );
    expect(resolveTwoECatalogName('2E-B2425B-01.EU', 'fallback')).toBe(
      "2E 23.8\" B2425B VA 100Hz monitor",
    );
  });

  it('prefixes 2E on unknown titles', () => {
    expect(resolveTwoECatalogName('UNKNOWN-1', 'Demo siçan')).toBe(
      '2E Demo siçan',
    );
    expect(resolveTwoECatalogName('UNKNOWN-1', '2E Demo siçan')).toBe(
      '2E Demo siçan',
    );
  });

  it('keeps generated store SKUs unique across the pricelist', () => {
    const compact = (sku: string) =>
      twoeSkuForGenerator(sku)
        .replace(/[^A-Z0-9]/gi, '')
        .slice(0, 16);
    const generated = TWOE_EXCEL_RAW_SKUS.map(compact);
    expect(new Set(generated).size).toBe(generated.length);
  });
});
