import { az } from '../apps/storefront/src/lib/i18n/messages/az';
import { en } from '../apps/storefront/src/lib/i18n/messages/en';
import { ru } from '../apps/storefront/src/lib/i18n/messages/ru';
import {
  localizeCatalogColor,
  localizeProductAttributeLabel,
  localizeProductAttributeValue,
  localizeProductSpecEntries,
} from '../apps/storefront/src/lib/i18n/localize-product-attribute';
import * as fs from 'fs';
import * as path from 'path';

const WORKSPACE = path.resolve(__dirname, '..');
const dir = path.join(WORKSPACE, 'apps/api/prisma');
const files = fs.readdirSync(dir).filter(f => (f.startsWith('import-') || f.startsWith('seed') || f.startsWith('restore-')) && f.endsWith('.ts'));

// Parse all catalog items from import scripts
const specPairs: Array<{ file: string; label: string; value: string }> = [];

for (const f of files) {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');

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

// Exclude internal image labels
const ignoreLabels = new Set(['scene7-original', 'snp-excel', 'snp-part', 'excel-fallback', 'main', 'gallery']);

// Unique labels map
const labelMap = new Map<string, Set<string>>();
for (const p of specPairs) {
  if (ignoreLabels.has(p.label)) continue;
  if (!labelMap.has(p.label)) {
    labelMap.set(p.label, new Set());
  }
  labelMap.get(p.label)!.add(p.value);
}

console.log(`Total unique spec labels: ${labelMap.size}`);

const untranslatedLabelsEn: Array<{ label: string; samples: string[] }> = [];
const untranslatedLabelsRu: Array<{ label: string; samples: string[] }> = [];

for (const label of Array.from(labelMap.keys()).sort()) {
  const enLabel = localizeProductAttributeLabel(label, en);
  const ruLabel = localizeProductAttributeLabel(label, ru);

  // If localizeProductAttributeLabel returns the original label (and it's an az label), check if it is translated
  // A label is untranslated if enLabel === label and label is in Azerbaijani, OR if en.product.attributeLabels doesn't have it.
  const hasInEn = Object.keys(en.product.attributeLabels).some(
    k => k.trim().toLocaleLowerCase('az') === label.trim().toLocaleLowerCase('az')
  );
  const hasInRu = Object.keys(ru.product.attributeLabels).some(
    k => k.trim().toLocaleLowerCase('az') === label.trim().toLocaleLowerCase('az')
  );

  if (!hasInEn) {
    untranslatedLabelsEn.push({ label, samples: Array.from(labelMap.get(label)!).slice(0, 3) });
  }
  if (!hasInRu) {
    untranslatedLabelsRu.push({ label, samples: Array.from(labelMap.get(label)!).slice(0, 3) });
  }
}

console.log('\n=== UNTRANSLATED SPEC LABELS IN EN ===', untranslatedLabelsEn.length);
console.log(JSON.stringify(untranslatedLabelsEn, null, 2));

console.log('\n=== UNTRANSLATED SPEC LABELS IN RU ===', untranslatedLabelsRu.length);
console.log(JSON.stringify(untranslatedLabelsRu, null, 2));

// Now test all spec VALUES
const untranslatedValues: Array<{
  label: string;
  value: string;
  enLocalized: string;
  ruLocalized: string;
}> = [];

for (const [label, vals] of labelMap.entries()) {
  for (const value of vals) {
    const enVal = localizeProductAttributeValue(label, value, 'en');
    const ruVal = localizeProductAttributeValue(label, value, 'ru');

    // Check if the value has Azerbaijani text that was left untranslated
    // e.g. contains Azerbaijani characters (ə, ı, ö, ğ, ş, ü, ç) or known AZ words (və, üçün, dəstdə, qara, ağ, bəli, yoxdur, daxildir, etc.)
    const hasAzText = /[əıöğşüƏIÖĞŞÜ]|\b(və|üçün|ilə|dəst|dəstdə|daxil|daxildir|yoxdur|var|qara|ağ|boz|göy|qırmızı|yaşıl|sarı|bənövşəyi|çəhrayı|səhifə|ədəd|nüvə|axın|düymə|parça|torpaqlama|avroştepsel|avrorozetka|ölçü|hündürlük|çəki|resurs|zəmanət|ay|il)\b/i.test(value);

    // If enVal or ruVal still contains untranslated Azerbaijani markers
    const enStillAz = /[əıöğşüƏIÖĞŞÜ]|\b(və|üçün|ilə|dəstdə|daxildir|yoxdur|qara|ağ|səhifə|nüvə|axın|düymə)\b/i.test(enVal);
    const ruStillAz = /[əıöğşüƏIÖĞŞÜ]|\b(və|üçün|ilə|dəstdə|daxildir|yoxdur|qara|ağ|səhifə|nüvə|axın|düymə)\b/i.test(ruVal);

    if (hasAzText && (enStillAz || ruStillAz)) {
      untranslatedValues.push({
        label,
        value,
        enLocalized: enVal,
        ruLocalized: ruVal,
      });
    }
  }
}

console.log('\n=== UNTRANSLATED SPEC VALUES (contain AZ text not localized to EN/RU) ===', untranslatedValues.length);
console.log(JSON.stringify(untranslatedValues, null, 2));
