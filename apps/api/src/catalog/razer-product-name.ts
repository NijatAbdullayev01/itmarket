/**
 * Razer catalog names: brand + marketing model + short type.
 * Datasheet clauses stay in requiredSpecs, not in the product title.
 */

export type RazerNameSpec = {
  label: string;
  value: string;
};

const RAZER_CATALOG_NAMES: Record<string, string> = {
  'RZ04-05180100-R3M1': 'Razer Kraken V4 X qara USB oyun qulaqlığı',
  'RZ04-05170100-R3M1': 'Razer Kraken V4 qara simsiz oyun qulaqlığı',
  'RZ04-05220100-R3M1': 'Razer Barracuda X Chroma qara simsiz oyun qulaqlığı',
  'RZ04-05410100-R3M1': 'Razer BlackShark V3 qara oyun qulaqlığı',
  'RZ04-05420200-R3M1':
    'Razer BlackShark V3 X HyperSpeed Xbox qara simsiz oyun qulaqlığı',
  'RZ04-04530100-R3M1':
    'Razer BlackShark V2 Pro (2023) qara simsiz oyun qulaqlığı',
  'RZ04-04530200-R3M1':
    'Razer BlackShark V2 Pro (2023) ağ simsiz oyun qulaqlığı',
  'RZ04-03750300-R3M1': 'Razer Kraken V3 X qara USB oyun qulaqlığı',
  'RZ04-04960100-R3M1':
    'Razer BlackShark V2 HyperSpeed qara simsiz oyun qulaqlığı',
  'RZ04-05220200-R3M1': 'Razer Barracuda X Chroma ağ simsiz oyun qulaqlığı',
  'RZ04-03241000-R3G1': 'Razer BlackShark V2 X PlayStation qara oyun qulaqlığı',
  'RZ04-03241300-R3G1': 'Razer BlackShark V2 X PlayStation ağ oyun qulaqlığı',
  'RZ04-02950100-R381': 'Razer Kraken X Lite qara 3.5 mm oyun qulaqlığı',
  'RZ04-03240100-R3M1': 'Razer BlackShark V2 X qara oyun qulaqlığı',
  'RZ04-03240700-R3M1': 'Razer BlackShark V2 X ağ oyun qulaqlığı',
  'RZ04-03240800-R3M1': 'Razer BlackShark V2 X Quartz oyun qulaqlığı',
  'RZ04-04430100-R3M1': 'Razer Barracuda X qara simsiz oyun qulaqlığı',
  'RZ04-04730100-R3M1': 'Razer Kraken Kitty V2 qara USB oyun qulaqlığı',
  'RZ04-05160100-R3M1': 'Razer Kraken V4 Pro qara simsiz oyun qulaqlığı',
  'RZ04-05220300-R3M1':
    'Razer Barracuda X Chroma Phantom Green simsiz oyun qulaqlığı',
  'RZ04-05220400-R3M1':
    'Razer Barracuda X Chroma Phantom White simsiz oyun qulaqlığı',
  'RZ04-05350100-R3M1': 'Razer Kraken Kitty V3 X Quartz oyun qulaqlığı',
  'RZ04-05350200-R3M1': 'Razer Kraken Kitty V3 X qara oyun qulaqlığı',
  'RZ04-05350300-R3M1': 'Razer Kraken Kitty V3 X ağ oyun qulaqlığı',
  'RZ04-05400800-R3M1':
    'Razer BlackShark V3 Pro Counter-Strike 2 simsiz oyun qulaqlığı',
  'RZ04-05420100-R3M1':
    'Razer BlackShark V3 X HyperSpeed qara simsiz oyun qulaqlığı',
  'RZ04-03240900-R3M1': 'Razer BlackShark V2 X Xbox qara oyun qulaqlığı',
  'RZ04-05400100-R3M1': 'Razer BlackShark V3 Pro qara simsiz oyun qulaqlığı',
  'RZ04-05410400-R3M1': 'Razer BlackShark V3 ağ oyun qulaqlığı',
  'RZ04-05410200-R3M1': 'Razer BlackShark V3 Xbox qara oyun qulaqlığı',
  'RZ04-05410300-R3G1': 'Razer BlackShark V3 PlayStation qara oyun qulaqlığı',
  'RZ05-04760100-R3G1': 'Razer Nommo V2 X qara 2.0 oyun dinamiki',
  'RZ03-04692500-R3R1':
    'Razer BlackWidow V4 Yellow Switch EN/RU oyun klaviaturası',
  'RZ03-03490700-R3R1':
    'Razer BlackWidow V3 TKL Green Switch EN/RU oyun klaviaturası',
  'RZ03-04702500-R3R1':
    'Razer BlackWidow V4 X Yellow Switch EN/RU oyun klaviaturası',
  'RZ03-03390200-R3M1': 'Razer Huntsman Mini Red Switch EN oyun klaviaturası',
  'RZ03-04700800-R3R1':
    'Razer BlackWidow V4 X Green Switch EN/RU oyun klaviaturası',
  'RZ03-04881600-R3R1': 'Razer Ornata V3 TKL EN/RU oyun klaviaturası',
  'RZ03-04460100-R3M1': 'Razer Ornata V3 EN oyun klaviaturası',
  'RZ03-05520100-R3M1': 'Razer Huntsman V3 Pro TKL 8KHz EN oyun klaviaturası',
  'RZ03-02360100-R3M1': 'Razer Joro Ultra Low-Profile EN simsiz klaviatura',
  'RZ03-04470800-R3R1': 'Razer Ornata V3 X EN/RU oyun klaviaturası',
  'RZ03-05130100-R3M1':
    'Razer BlackWidow V4 Pro 75% EN simsiz oyun klaviaturası',
  'RZ03-05450100-R3M1':
    'Razer BlackWidow V4 Low-profile TKL HyperSpeed Yellow EN simsiz oyun klaviaturası',
  'RZ03-03391500-R3R1':
    'Razer Huntsman Mini Purple Switch EN/RU oyun klaviaturası',
  'RZ03-05003300-R3M1':
    'Razer BlackWidow V4 75% Phantom Green EN oyun klaviaturası',
  'RZ03-05003500-R3M1':
    'Razer BlackWidow V4 75% Phantom White EN oyun klaviaturası',
  'RZ03-05530100-R3M1': 'Razer Huntsman V3 Pro 8KHz EN oyun klaviaturası',
  'RZ03-04110100-R3M1': 'Razer Pro Type Ultra ağ simsiz klaviatura',
  'RZ03-05270100-R3M1':
    'Razer BlackWidow V4 Low-profile HyperSpeed Green EN simsiz oyun klaviaturası',
  'RZ03-05270800-R3M1':
    'Razer BlackWidow V4 Low-profile HyperSpeed Orange EN simsiz oyun klaviaturası',
  'RZ03-05271500-R3M1':
    'Razer BlackWidow V4 Low-profile HyperSpeed Yellow EN simsiz oyun klaviaturası',
  'RZ03-05450500-R3M1':
    'Razer BlackWidow V4 Low-profile TKL HyperSpeed Green EN simsiz oyun klaviaturası',
  'RZ03-03392200-R3R1':
    'Razer Huntsman Mini Mercury Red Switch RU oyun klaviaturası',
  'RZ03-04990100-R3M1': 'Razer Huntsman V3 Pro Mini EN oyun klaviaturası',
  'RZ01-04630100-R3G1': 'Razer DeathAdder V3 Pro qara simsiz oyun siçanı',
  'RZ01-03730100-R3G1': 'Razer Orochi V2 qara simsiz oyun siçanı',
  'RZ01-03730400-R3G1': 'Razer Orochi V2 ağ simsiz oyun siçanı',
  'RZ01-03900100-R3M1': 'Razer Pro Click V2 qara simsiz siçan',
  'RZ01-04620100-R3G1': 'Razer Basilisk V3 Pro qara simsiz oyun siçanı',
  'RZ01-04620200-R3G1': 'Razer Basilisk V3 Pro ağ simsiz oyun siçanı',
  'RZ01-04640100-R3M1': 'Razer DeathAdder V3 qara naqilli oyun siçanı',
  'RZ01-05230100-R3M1': 'Razer Basilisk V3 35K qara naqilli oyun siçanı',
  'RZ01-04630200-R3G1': 'Razer DeathAdder V3 Pro ağ simsiz oyun siçanı',
  'RZ01-05140100-R3G1':
    'Razer DeathAdder V3 HyperSpeed qara simsiz oyun siçanı',
  'RZ01-04130100-R3G1': 'Razer DeathAdder V2 X HyperSpeed simsiz oyun siçanı',
  'RZ01-03850100-R3M1': 'Razer DeathAdder Essential qara oyun siçanı',
  'RZ01-03850200-R3M1': 'Razer DeathAdder Essential ağ oyun siçanı',
  'RZ01-04310100-R3G1': 'Razer Basilisk Mobile qara simsiz oyun siçanı',
  'RZ01-04660200-R3G1': 'Razer Cobra Pro ağ simsiz oyun siçanı',
  'RZ01-04870100-R3G1':
    'Razer Basilisk V3 X HyperSpeed qara simsiz oyun siçanı',
  'RZ01-04910100-R3M1': 'Razer Viper V3 HyperSpeed qara simsiz oyun siçanı',
  'RZ01-05120100-R3G1': 'Razer Viper V3 Pro qara simsiz oyun siçanı',
  'RZ01-05120200-R3G1': 'Razer Viper V3 Pro ağ simsiz oyun siçanı',
  'RZ01-05120800-R3M1':
    'Razer Viper V3 Pro Counter-Strike 2 simsiz oyun siçanı',
  'RZ01-05240100-R3G1': 'Razer Basilisk V3 Pro 35K qara simsiz oyun siçanı',
  'RZ01-05240200-R3G1': 'Razer Basilisk V3 Pro 35K ağ simsiz oyun siçanı',
  'RZ01-05240300-R3G1':
    'Razer Basilisk V3 Pro 35K Phantom Green simsiz oyun siçanı',
  'RZ01-05240400-R3G1':
    'Razer Basilisk V3 Pro 35K Phantom White simsiz oyun siçanı',
  'RZ01-05250100-R3G1': 'Razer Pro Click V2 Vertical qara simsiz siçan',
  'RZ01-05330100-R3G1': 'Razer DeathAdder V4 Pro qara simsiz oyun siçanı',
  'RZ01-05330200-R3G1': 'Razer DeathAdder V4 Pro ağ simsiz oyun siçanı',
  'RZ01-05570100-R3G1': 'Razer Cobra HyperSpeed qara simsiz oyun siçanı',
  'RZ01-04000100-R3M1': 'Razer Basilisk V3 qara naqilli oyun siçanı',
  'RZ01-04650100-R3M1': 'Razer Cobra qara naqilli oyun siçanı',
  'RZ01-04660100-R3G1': 'Razer Cobra Pro qara simsiz oyun siçanı',
  'RZ02-03810100-R3M1': 'Razer Strider XXL oyun siçan altlığı',
  'RZ02-04890100-R3M1': 'Razer Atlas L qara şüşə oyun siçan altlığı',
  'RZ02-04890200-R3M1': 'Razer Atlas L ağ şüşə oyun siçan altlığı',
  'RZ02-01820200-R3M1': 'Razer Goliathus Mobile S qara-yaşıl siçan altlığı',
  'RZ02-01820500-R3M1': 'Razer Goliathus Mobile Stealth S siçan altlığı',
  'RZ02-03330200-R3M1': 'Razer Gigantus V2 M oyun siçan altlığı',
  'RZ02-03330400-R3M1': 'Razer Gigantus V2 XXL oyun siçan altlığı',
  'RZ02-03330500-R3M1': 'Razer Gigantus V2 3XL oyun siçan altlığı',
  'RZ02-03332300-R3M1': 'Razer Pro Glide XXL boz oyun siçan altlığı',
  'RZ02-04920300-R3M1': 'Razer Firefly V2 Pro Phantom Green RGB siçan altlığı',
  'RZ02-04920400-R3M1': 'Razer Firefly V2 Pro Phantom White RGB siçan altlığı',
  'RZ02-03333300-R3M1': 'Razer Gigantus V2 L Counter-Strike 2 siçan altlığı',
  'RZ02-03330300-R3M1': 'Razer Gigantus V2 L oyun siçan altlığı',
  'RZ02-02500700-R3M1': 'Razer Goliathus Chroma 3XL RGB siçan altlığı',
  'RZ02-04920100-R3M1': 'Razer Firefly V2 Pro qara RGB siçan altlığı',
  'RC81-03650101-0000': 'Razer Rogue V3 17.3" oyun çantası',
  'RC81-03630101-0000': 'Razer Rogue V3 13.3"/14" oyun çantası',
  'RC81-03630116-0000': 'Razer Rogue V3 13.3"/14" Chromatic oyun çantası',
  'RZ38-04900300-R3G1': 'Razer Iskur V2 parça tünd boz oyun kreslosu',
  'RZ38-05310100-R3G1': 'Razer Iskur V2 X parça qara oyun kreslosu',
  'RZ38-05310200-R3G1': 'Razer Iskur V2 X parça açıq boz oyun kreslosu',
  'RZ19-05050300-R3M1': 'Razer Seiren V3 Mini ağ USB oyun mikrofonu',
  'RZ19-05060100-R3M1': 'Razer Seiren V3 Chroma qara USB oyun mikrofonu',
  'RZ19-05060200-R3M1': 'Razer Seiren V3 Chroma ağ USB oyun mikrofonu',
  'RC30-474C0100-R3M1': 'Razer Wireless Control Pod qara idarə pulti',
  'RZ06-05540100-R3M1': 'Razer Wolverine V3 Pro 8K PC simsiz oyun pultu',
  'RZ06-05210100-R3M1':
    'Razer Wolverine V3 Tournament cross-platform oyun pultu',
  'RZ06-05210200-R3M1': 'Razer Wolverine V3 Tournament Xbox/PC ağ oyun pultu',
};

const TYPE_SUFFIXES = [
  'simsiz oyun klaviaturası',
  'simsiz oyun qulaqlığı',
  'simsiz oyun siçanı',
  'simsiz oyun pultu',
  'USB oyun qulaqlığı',
  'USB oyun mikrofonu',
  'naqilli oyun siçanı',
  'oyun klaviaturası',
  'oyun qulaqlığı',
  'oyun siçan altlığı',
  'siçan altlığı',
  'oyun siçanı',
  'oyun çantası',
  'oyun kreslosu',
  'oyun dinamiki',
  'oyun mikrofonu',
  'oyun pultu',
  'idarə pulti',
  'simsiz klaviatura',
  'simsiz siçan',
] as const;

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeRazerSku(model: string): string {
  return model
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9._-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

export function listRazerCatalogNameSkus(): string[] {
  return Object.keys(RAZER_CATALOG_NAMES);
}

export function razerDisplayModel(sku: string, fallbackTitle: string): string {
  const catalogName = resolveRazerCatalogName(sku, fallbackTitle);
  let model = catalogName.replace(/^Razer\s+/i, '').trim();
  for (const suffix of TYPE_SUFFIXES) {
    const pattern = new RegExp(`\\s+${suffix.replaceAll(' ', '\\s+')}$`, 'i');
    if (pattern.test(model)) {
      model = model.replace(pattern, '').trim();
      break;
    }
  }
  return model;
}

export function resolveRazerCatalogName(
  sku: string,
  fallbackTitle: string,
): string {
  const normalized = normalizeRazerSku(sku);
  const mapped = RAZER_CATALOG_NAMES[normalized];
  if (mapped !== undefined) {
    return mapped;
  }

  const trimmed = collapseWhitespace(fallbackTitle);
  if (/^razer\b/i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed === '') {
    return `Razer ${normalized}`;
  }
  return `Razer ${trimmed}`;
}
