import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import { az } from './messages/az';
import { en } from './messages/en';
import { ru } from './messages/ru';
import {
  localizeCatalogColor,
  localizeProductAttributeLabel,
  localizeProductAttributeValue,
  localizeProductSpecEntries,
} from './localize-product-attribute';

describe('Catalog specifications localization completeness', () => {
  it('identifies and tests all product specifications from import and catalog files', () => {
    const WORKSPACE = path.resolve(__dirname, '../../../../..');
    const prismaDir = path.join(WORKSPACE, 'apps/api/prisma');
    const prismaFiles = fs.existsSync(prismaDir)
      ? fs.readdirSync(prismaDir).filter(f => (f.startsWith('import-') || f.startsWith('seed') || f.startsWith('restore-')) && f.endsWith('.ts'))
      : [];

    const specPairs: Array<{ file: string; label: string; value: string }> = [];

    for (const f of prismaFiles) {
      const content = fs.readFileSync(path.join(prismaDir, f), 'utf8');

      // Match features: `...`
      const featureMatches = content.matchAll(/features:\s*`([^`]+)`/g);
      for (const match of featureMatches) {
        const text = match[1];
        for (const line of text.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const idx = trimmed.indexOf(':');
          if (idx > 0) {
            const label = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim();
            if (label && val) {
              specPairs.push({ file: f, label, value: val });
            }
          }
        }
      }

      // Match features: '...' or "..."
      const strFeatureMatches = content.matchAll(/features:\s*['"]([^'"]+)['"]/g);
      for (const match of strFeatureMatches) {
        const text = match[1];
        for (const line of text.split(/\\n|\n/)) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const idx = trimmed.indexOf(':');
          if (idx > 0) {
            const label = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim();
            if (label && val) {
              specPairs.push({ file: f, label, value: val });
            }
          }
        }
      }

      // Match label: '...', value: '...'
      const labelValRegex = /label:\s*['"`]([^'"`]+)['"`],\s*value:\s*['"`]([^'"`]+)['"`]/g;
      for (const match of content.matchAll(labelValRegex)) {
        const label = match[1].trim();
        const val = match[2].trim();
        if (label && val) {
          specPairs.push({ file: f, label, value: val });
        }
      }
    }

    // Also check all files in apps/api/src/catalog
    const catalogDir = path.join(WORKSPACE, 'apps/api/src/catalog');
    if (fs.existsSync(catalogDir)) {
      for (const f of fs.readdirSync(catalogDir)) {
        if (f.endsWith('.ts')) {
          const content = fs.readFileSync(path.join(catalogDir, f), 'utf8');
          const labelValRegex = /label:\s*['"`]([^'"`]+)['"`],\s*value:\s*['"`]([^'"`]+)['"`]/g;
          for (const match of content.matchAll(labelValRegex)) {
            const label = match[1].trim();
            const val = match[2].trim();
            if (label && val) {
              specPairs.push({ file: f, label, value: val });
            }
          }
        }
      }
    }

    const ignoreLabels = new Set([
      'scene7-original', 'snp-excel', 'snp-part', 'excel-fallback', 'main', 'gallery',
      'email', 'baku', 'bineqedi', 'gence', 'lenkeran', 'mingecevir', 'naftalan', 'naxcivan', 'nizami', 'nerimanov', 'nesimi', 'pirallahi', 'qaradag', 'sabuncu', 'sumqayit', 'suraxani', 'sebail', 'xankendi', 'xetai', 'xezer', 'yasamal', 'yevlax', 'sirvan', 'seki',
      'spec ${index + 1}', 'xüsusiyyət ${index + 1}', 'xüsusiyyət 1', 'xüsusiyyət 18',
      '...',
    ]);

    const labelMap = new Map<string, Set<string>>();
    for (const p of specPairs) {
      if (ignoreLabels.has(p.label.toLowerCase())) continue;
      if (!labelMap.has(p.label)) {
        labelMap.set(p.label, new Set());
      }
      labelMap.get(p.label)!.add(p.value);
    }

    console.log(`Extracted ${labelMap.size} unique spec labels across all catalog sources.`);

    const missingEnLabels: string[] = [];
    const missingRuLabels: string[] = [];
    const missingAzLabels: string[] = [];

    for (const label of Array.from(labelMap.keys()).sort()) {
      const azTranslated = localizeProductAttributeLabel(label, az);
      const enTranslated = localizeProductAttributeLabel(label, en);
      const ruTranslated = localizeProductAttributeLabel(label, ru);

      // Check if translation exists in message dictionaries
      const norm = label.trim().toLocaleLowerCase('az');
      const inAz = Object.keys(az.product.attributeLabels).some(k => k.trim().toLocaleLowerCase('az') === norm);
      const inEn = Object.keys(en.product.attributeLabels).some(k => k.trim().toLocaleLowerCase('az') === norm);
      const inRu = Object.keys(ru.product.attributeLabels).some(k => k.trim().toLocaleLowerCase('az') === norm);

      if (!inAz) missingAzLabels.push(label);
      if (!inEn) missingEnLabels.push(label);
      if (!inRu) missingRuLabels.push(label);
    }

    console.log('Missing in AZ attributeLabels:', JSON.stringify(missingAzLabels));
    console.log('Missing in EN attributeLabels:', JSON.stringify(missingEnLabels));
    console.log('Missing in RU attributeLabels:', JSON.stringify(missingRuLabels));

    // Check all values
    const untranslatedValues: Array<{
      label: string;
      value: string;
      en: string;
      ru: string;
      issue: string;
    }> = [];

    const azWordPattern = /\b(və|üçün|ilə|dəst|dəstdə|daxil|daxildir|yoxdur|yox|var|bəli|xeyr|qara|ağ|boz|göy|qırmızı|yaşıl|sarı|bənövşəyi|çəhrayı|səhifə|səh\/dəq|ədəd|nüvə|axın|düymə|düyməsi|düyməli|parça|torpaqlama|avroştepsel|avrorozetka|ölçü|ölçülər|hündürlük|çəki|resurs|zəmanət|ay|il|yalnız|çap|surət|skan|şəffaf|titanyum|gümüşü|qızılı|təkrar|doldurulan|batareya|akkumulyator|simli|simsiz|erqonomik|optik|siçan|klaviatura|qulaqlıq|kabel|korpus|davamlı|toxunma|qoruyucu|lay|resurslu|dözümlü|sviçlər|özəllik|xüsusiyyət|tavan|divar|montaj|qoşa|rezin|plastik|örtük|örtüklə|adapterli|mat|adapterlə|dəstdə|unit|masaüstü|bərkitmə|təmizləyici|qələm|ucluq|fırça|tüklü|ofis|gündəlik|klassik|format|nəmə|maye|sıçramalarına|qarşı|avtomatik|yuxu|rejimi|uzunmüddətli|enerji|qənaət|fasiləsiz|keçid|kanal|zolağı|eyni|vaxtda|tutumu|quruluşu|şifrələmə|təhlükəsizlik|bərpa|ayrılması|səssiz|tələb|etmir|şəbəkə|örtüyü|ağıllı|lampası|nəzarət|canlı|qeydiyyatı|mühafizə|fırlanma|aydın|görmə|məsafəsi|zülmət|qaranlıqda|danışıq|səs-küyün|ləğvi|siren|fərdiləşdirilə|bilən|yuvası|şəraitinə|tanıma|təhlükəsiz|köpük|yastığı|dayaqı)\b/i;
    const azCharPattern = /[əöğşüçıƏÖĞŞÜÇİ]/;

    for (const [label, values] of labelMap.entries()) {
      for (const val of values) {
        // Skip technical model names or SKUs
        if (label === 'Model' || label === 'Part number' || label === 'SKU' || label === 'Barkod' || label === 'Barcode') {
          continue;
        }

        const isAz = azWordPattern.test(val) || azCharPattern.test(val);
        if (!isAz) continue;

        const enVal = localizeProductAttributeValue(label, val, 'en');
        const ruVal = localizeProductAttributeValue(label, val, 'ru');

        const enHasAz = azWordPattern.test(enVal) || azCharPattern.test(enVal);
        const ruHasAz = azWordPattern.test(ruVal) || azCharPattern.test(ruVal);

        if (enHasAz || ruHasAz) {
          untranslatedValues.push({
            label,
            value: val,
            en: enVal,
            ru: ruVal,
            issue: `EN has AZ: ${enHasAz}, RU has AZ: ${ruHasAz}`
          });
        }
      }
    }

    fs.writeFileSync(
      path.join(__dirname, 'specs_audit.json'),
      JSON.stringify(
        {
          missingAzLabels,
          missingEnLabels,
          missingRuLabels,
          untranslatedValuesCount: untranslatedValues.length,
          untranslatedValues,
        },
        null,
        2
      )
    );
  });
});
