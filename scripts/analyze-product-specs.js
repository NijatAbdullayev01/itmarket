const fs = require('fs');
const path = require('path');

const WORKSPACE = path.resolve(__dirname, '..');
const dir = path.join(WORKSPACE, 'apps/api/prisma');
const files = fs.readdirSync(dir).filter(f => (f.startsWith('import-') || f.startsWith('seed') || f.startsWith('restore-')) && f.endsWith('.ts'));

const allLabels = new Map(); // label -> Set of values

for (const f of files) {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  // 1. Look for template string features
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
          if (!allLabels.has(label)) allLabels.set(label, new Set());
          allLabels.get(label).add(val);
        }
      }
    }
  }

  // 2. Look for regular string features: '...' or "..."
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
          if (!allLabels.has(label)) allLabels.set(label, new Set());
          allLabels.get(label).add(val);
        }
      }
    }
  }

  // 3. Look for { label: '...', value: '...' }
  const labelValRegex = /label:\s*['"`]([^'"`]+)['"`],\s*value:\s*['"`]([^'"`]+)['"`]/g;
  for (const match of content.matchAll(labelValRegex)) {
    const label = match[1].trim();
    const val = match[2].trim();
    if (label && val) {
      if (!allLabels.has(label)) allLabels.set(label, new Set());
      allLabels.get(label).add(val);
    }
  }
}

// Also check apps/storefront and packages/ui and apps/api/src
const moreDirs = [
  path.join(WORKSPACE, 'apps/api/src'),
  path.join(WORKSPACE, 'apps/storefront/src'),
  path.join(WORKSPACE, 'packages/ui/src'),
  path.join(WORKSPACE, 'apps/backoffice/src')
];

function scanDir(d) {
  if (!fs.existsSync(d)) return;
  const entries = fs.readdirSync(d, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(d, entry.name);
    if (entry.isDirectory()) {
      scanDir(full);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      const content = fs.readFileSync(full, 'utf8');
      const labelValRegex = /label:\s*['"`]([^'"`]+)['"`],\s*value:\s*['"`]([^'"`]+)['"`]/g;
      for (const match of content.matchAll(labelValRegex)) {
        const label = match[1].trim();
        const val = match[2].trim();
        if (label && val && label.length < 50 && val.length < 300) {
          if (!allLabels.has(label)) allLabels.set(label, new Set());
          allLabels.get(label).add(val);
        }
      }
    }
  }
}

for (const d of moreDirs) {
  scanDir(d);
}

console.log('Total unique labels found:', allLabels.size);

// Read the raw ts files and parse attributeLabels
const enContent = fs.readFileSync(path.join(WORKSPACE, 'apps/storefront/src/lib/i18n/messages/en.ts'), 'utf8');
const ruContent = fs.readFileSync(path.join(WORKSPACE, 'apps/storefront/src/lib/i18n/messages/ru.ts'), 'utf8');
const azContent = fs.readFileSync(path.join(WORKSPACE, 'apps/storefront/src/lib/i18n/messages/az.ts'), 'utf8');

function extractAttributeMap(content) {
  const match = content.match(/attributeLabels:\s*\{([\s\S]*?)\n\s*\},/);
  if (!match) return {};
  const lines = match[1].split('\n');
  const res = {};
  for (const line of lines) {
    const m = line.match(/^\s*(?:"([^"]+)"|'([^']+)'|([a-zA-Z0-9_$]+))\s*:\s*["']([^"']+)["']/);
    if (m) {
      const key = m[1] || m[2] || m[3];
      const val = m[4];
      res[key.trim().toLowerCase()] = val;
    }
  }
  return res;
}

const enMap = extractAttributeMap(enContent);
const ruMap = extractAttributeMap(ruContent);
const azMap = extractAttributeMap(azContent);

console.log('EN attributeLabels count:', Object.keys(enMap).length);
console.log('RU attributeLabels count:', Object.keys(ruMap).length);
console.log('AZ attributeLabels count:', Object.keys(azMap).length);

const missingInEn = [];
const missingInRu = [];
const allFoundLabels = Array.from(allLabels.keys()).sort();

for (const label of allFoundLabels) {
  // Exclude non-spec metadata labels like 'scene7-original', 'snp-excel', 'main'
  if (['scene7-original', 'snp-excel', 'snp-part', 'excel-fallback', 'main', 'gallery'].includes(label)) continue;
  const norm = label.trim().toLowerCase();
  if (!enMap[norm]) {
    missingInEn.push({ label, count: allLabels.get(label).size, samples: Array.from(allLabels.get(label)).slice(0, 3) });
  }
  if (!ruMap[norm]) {
    missingInRu.push({ label, count: allLabels.get(label).size, samples: Array.from(allLabels.get(label)).slice(0, 3) });
  }
}

console.log('\n--- LABELS MISSING IN EN (' + missingInEn.length + ') ---');
console.log(JSON.stringify(missingInEn, null, 2));

console.log('\n--- LABELS MISSING IN RU (' + missingInRu.length + ') ---');
console.log(JSON.stringify(missingInRu, null, 2));

// Also analyze values that need translation in localize-product-attribute.ts
const localizeAttrContent = fs.readFileSync(path.join(WORKSPACE, 'apps/storefront/src/lib/i18n/localize-product-attribute.ts'), 'utf8');

// Check all values and see which ones are in Azerbaijani / not purely numbers / specs
const textValues = [];
for (const [l, vals] of allLabels.entries()) {
  for (const v of vals) {
    if (/[a-zA-ZçəıöğşüÇƏİÖĞŞÜа-яА-Я]/.test(v) && !/^[A-Z0-9\-_./\s#()]+$/.test(v)) {
      textValues.push({ label: l, value: v });
    }
  }
}

console.log('\nTotal textual spec values across catalog:', textValues.length);
fs.writeFileSync(path.join(WORKSPACE, 'scripts/all_text_values.json'), JSON.stringify(textValues, null, 2));
