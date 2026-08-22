/**
 * HyperX catalog names: brand + marketing model + short type.
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 */

export type HyperxNameSpec = {
  label: string;
  value: string;
};

const HYPERX_CATALOG_NAMES: Record<string, string> = {
  '64V61AA': 'HyperX Armada 25 FHD oyun monitoru',
  '64V69AA': 'HyperX Armada 27 QHD oyun monitoru',
  '7G8F3AA': 'HyperX Cloud Mini Multi oyun qulaqlığı',
  '7G8F4AA': 'HyperX Cloud Mini Qara oyun qulaqlığı',
  '7G8F5AA': 'HyperX Cloud Mini Lavanda oyun qulaqlığı',
  '683L9AA': 'HyperX Cloud Stinger 2 Core oyun qulaqlığı',
  '6H9B5AA': 'HyperX Cloud Stinger 2 Core PS Ağ oyun qulaqlığı',
  '6H9B6AA': 'HyperX Cloud Stinger 2 Core PS Qara oyun qulaqlığı',
  '6H9B8AA': 'HyperX CloudX Stinger 2 Core Xbox Qara oyun qulaqlığı',
  '6H9B7AA': 'HyperX CloudX Stinger 2 Core Xbox Ağ oyun qulaqlığı',
  '4P4F4AA': 'HyperX Cloud Stinger Core Qara oyun qulaqlığı',
  '519T1AA': 'HyperX Cloud Stinger 2 Qara oyun qulaqlığı',
  '4P5L7AX': 'HyperX Cloud Stinger Qara-qırmızı oyun qulaqlığı',
  '727A8AA': 'HyperX Cloud III Qara oyun qulaqlığı',
  '727A9AA': 'HyperX Cloud III Qara-qırmızı oyun qulaqlığı',
  BS7C1AA: 'HyperX Cloud III Ağ oyun qulaqlığı',
  '4P5L1AX': 'HyperX Cloud Alpha Qara-qırmızı oyun qulaqlığı',
  '4P5L1AM': 'HyperX Cloud Alpha Qara-qırmızı oyun qulaqlığı',
  '4P5L2AA': 'HyperX Cloud Alpha S Qara oyun qulaqlığı',
  '705L8AA': 'HyperX Cloud Earbuds II Qırmızı qulaqici qulaqlıq',
  '7G8F1AA': 'HyperX Cloud Mini Qara simsiz oyun qulaqlığı',
  '7G8F2AA': 'HyperX Cloud Mini Ağ simsiz oyun qulaqlığı',
  AJ0T1AA: 'HyperX Cloud Jet Qara simsiz oyun qulaqlığı',
  '75X29AA': 'HyperX Cloud Stinger II PlayStation oyun qulaqlığı',
  '727A5AA': 'HyperX Cirro Buds Pro Qara TWS qulaqlıq',
  '727A7AA': 'HyperX Cirro Buds Pro Bej TWS qulaqlıq',
  '4P5J1AA': 'HyperX Cloud Stinger Core PS simsiz oyun qulaqlığı',
  '676A2AA': 'HyperX Cloud Stinger 2 simsiz oyun qulaqlığı',
  '70N24AA': 'HyperX Cloud Earbuds II Qara qulaqici qulaqlıq',
  '6Y2G8AA': 'HyperX Cloud II Core simsiz oyun qulaqlığı',
  '4P5D9AA': 'HyperX Cloud MIX Buds TWS qulaqlıq',
  '77Z45AA': 'HyperX Cloud III Wireless Qara simsiz oyun qulaqlığı',
  '77Z46AA': 'HyperX Cloud III Wireless Qara-qırmızı simsiz oyun qulaqlığı',
  BS1T8AA: 'HyperX Cloud Stinger 3 simsiz oyun qulaqlığı',
  BS1T9AA: 'HyperX Cloud Stinger 3 PlayStation simsiz oyun qulaqlığı',
  BS1U0AA: 'HyperX CloudX Stinger 3 Xbox simsiz oyun qulaqlığı',
  BS1T5AA: 'HyperX Cloud Stinger 3 oyun qulaqlığı',
  BS1T6AA: 'HyperX Cloud Stinger 3 PlayStation oyun qulaqlığı',
  BS1T7AA: 'HyperX CloudX Stinger 3 Xbox oyun qulaqlığı',
  A59YZAA: 'HyperX Cloud III S Wireless Qara simsiz oyun qulaqlığı',
  A59Z0AA: 'HyperX Cloud III S Wireless Qara-qırmızı simsiz oyun qulaqlığı',
  '4P5D4AA': 'HyperX Cloud Alpha Wireless Qara-qırmızı simsiz oyun qulaqlığı',
  '4P5P8AA': 'HyperX SoloCast Qara USB mikrofon',
  '519T2AA': 'HyperX SoloCast Ağ USB mikrofon',
  AR0A0AA: 'HyperX SoloCast 2 Qara USB mikrofon',
  '4P5E2AA': 'HyperX DuoCast USB mikrofon',
  '4P5P6AA': 'HyperX QuadCast USB mikrofon',
  '872V1AA': 'HyperX QuadCast 2 USB mikrofon',
  '4P5P7AA': 'HyperX QuadCast S Qara-boz USB mikrofon',
  '519P0AA': 'HyperX QuadCast S Ağ-boz USB mikrofon',
  '9A273AA': 'HyperX QuadCast 2 S USB mikrofon',
  '4P5M9AA': 'HyperX Wrist Rest Full Size klaviatura dayağı',
  '4P4F5AX': 'HyperX Alloy Core RGB RU oyun klaviaturası',
  B7JE0AA: 'HyperX Eve 1800 US oyun klaviaturası',
  '4P5N0AA': 'HyperX Alloy Origins 60 HX Red oyun klaviaturası',
  '4P5E1AX': 'HyperX Alloy MKW100 TTC Red RU oyun klaviaturası',
  '4P5D6AX': 'HyperX Alloy Origins 65 HX Red RU oyun klaviaturası',
  '4P4F6AX': 'HyperX Alloy Origins HX Red RU oyun klaviaturası',
  '639N7AA': 'HyperX Alloy Origins Core PBT HX Red oyun klaviaturası',
  '639N9AA': 'HyperX Alloy Origins Core PBT HX Aqua oyun klaviaturası',
  '639N3AA': 'HyperX Alloy Origins PBT HX Red oyun klaviaturası',
  '639N5AA': 'HyperX Alloy Origins PBT HX Aqua oyun klaviaturası',
  B4QS3AA: 'HyperX Alloy Origins 2 65 US oyun klaviaturası',
  '4P5N3AX': 'HyperX Alloy Elite 2 HX Red RU oyun klaviaturası',
  B4QS4AA: 'HyperX Alloy Origins 2 1800 US oyun klaviaturası',
  '7G7A4AA': 'HyperX Alloy Rise 75 oyun klaviaturası',
  '7G7A3AA': 'HyperX Alloy Rise RU oyun klaviaturası',
  '91Y91AA': 'HyperX Alloy Rise 75 simsiz oyun klaviaturası',
  '4P4F8AA': 'HyperX Pulsefire Core Qara oyun siçanı',
  '4P4F7AA': 'HyperX Pulsefire FPS Pro Gunmetal oyun siçanı',
  '4P5Q1AA': 'HyperX Pulsefire Surge Qara oyun siçanı',
  '8R2E7AA': 'HyperX Pulsefire Haste 2 Core Ağ-yaşıl-bənövşəyi simsiz oyun siçanı',
  '8R2E6AA': 'HyperX Pulsefire Haste 2 Core Qara simsiz oyun siçanı',
  A1KY6AA: 'HyperX Pulsefire Fuse Qara simsiz oyun siçanı',
  A2PB3AA: 'HyperX Pulsefire Saga oyun siçanı',
  '6N0A8AA': 'HyperX Pulsefire Haste 2 Ağ oyun siçanı',
  '6N0A7AA': 'HyperX Pulsefire Haste 2 Qara oyun siçanı',
  '7D388AA': 'HyperX Pulsefire Haste 2 Mini Qara simsiz oyun siçanı',
  '7D389AA': 'HyperX Pulsefire Haste 2 Mini Ağ simsiz oyun siçanı',
  '6N0B0AA': 'HyperX Pulsefire Haste 2 Qara simsiz oyun siçanı',
  '6N0A9AA': 'HyperX Pulsefire Haste 2 Ağ simsiz oyun siçanı',
  A1KY5AA: 'HyperX Pulsefire Haste 2 Pro 4K simsiz oyun siçanı',
  A2PB2AA: 'HyperX Pulsefire Saga Pro simsiz oyun siçanı',
  '4P4F9AA': 'HyperX FURY S L siçan altlığı',
  '4P5Q8AA': 'HyperX FURY S Speed XL siçan altlığı',
  '4Z7X3AA': 'HyperX Pulsefire Mat M siçan altlığı',
  '4Z7X4AA': 'HyperX Pulsefire Mat L siçan altlığı',
  '4Z7X5AA': 'HyperX Pulsefire Mat XL siçan altlığı',
  '4S7T2AA': 'HyperX Pulsefire Mat RGB XL siçan altlığı',
  '4Z7X6AA': 'HyperX Pulsefire Mat 2XL siçan altlığı',
  '8C524AA': 'HyperX Delta Backpack oyun çantası',
  '8C525AA': 'HyperX Knight Backpack oyun çantası',
  '4Z7X2AA': 'HyperX Wrist Rest siçan dayağı',
  '786H6AA': 'HyperX Caster mikrofon qolu',
  '73C12AA': 'HyperX Audio Mixer audio mikser',
  '75X30AA': 'HyperX Vision S veb kamera',
  '7D6H2AA': 'HyperX Clutch Gladiate oyun pultu',
  '51P68AA': 'HyperX ChargePlay Duo PS5 şarj stansiyası',
};

const TYPE_SUFFIXES = [
  'simsiz oyun klaviaturası',
  'simsiz oyun qulaqlığı',
  'simsiz oyun siçanı',
  'oyun klaviaturası',
  'oyun qulaqlığı',
  'qulaqici qulaqlıq',
  'TWS qulaqlıq',
  'USB mikrofon',
  'mikrofon qolu',
  'klaviatura dayağı',
  'siçan dayağı',
  'siçan altlığı',
  'oyun siçanı',
  'oyun çantası',
  'oyun monitoru',
  'veb kamera',
  'oyun pultu',
  'şarj stansiyası',
  'audio mikser',
] as const;

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeHyperxSku(model: string): string {
  return model
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9._-]+/g, '')
    .slice(0, 64);
}

export function listHyperxCatalogNameSkus(): string[] {
  return Object.keys(HYPERX_CATALOG_NAMES);
}

export function hyperxDisplayModel(
  sku: string,
  fallbackTitle: string,
): string {
  const catalogName = resolveHyperxCatalogName(sku, fallbackTitle);
  let model = catalogName.replace(/^HyperX\s+/i, '').trim();
  for (const suffix of TYPE_SUFFIXES) {
    const pattern = new RegExp(`\\s+${suffix.replaceAll(' ', '\\s+')}$`, 'i');
    if (pattern.test(model)) {
      model = model.replace(pattern, '').trim();
      break;
    }
  }
  return model;
}

export function resolveHyperxCatalogName(
  sku: string,
  fallbackTitle: string,
  _options?: {
    subcategorySlug?: string;
    specs?: readonly HyperxNameSpec[];
  },
): string {
  const normalized = normalizeHyperxSku(sku);
  const mapped = HYPERX_CATALOG_NAMES[normalized];
  if (mapped !== undefined) {
    return mapped;
  }

  const trimmed = collapseWhitespace(fallbackTitle);
  if (/^hyperx\b/i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed === '') {
    return `HyperX ${normalized}`;
  }
  return `HyperX ${trimmed}`;
}
