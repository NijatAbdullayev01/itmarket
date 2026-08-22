const fs = require('fs');
const path = require('path');

const WORKSPACE = path.resolve(__dirname, '..');
const dir = path.join(WORKSPACE, 'apps/api/prisma');
const files = fs.readdirSync(dir).filter(f => (f.startsWith('import-') || f.startsWith('seed') || f.startsWith('restore-')) && f.endsWith('.ts'));

// Parse all catalog items from import scripts
const specPairs = []; // Array of { file, label, value }

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

function normalizeKey(l) {
  return l.trim().toLocaleLowerCase('az');
}

// Read current messages
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
      res[normalizeKey(key)] = val;
    }
  }
  return res;
}

const enMap = extractAttributeMap(enContent);
const ruMap = extractAttributeMap(ruContent);
const azMap = extractAttributeMap(azContent);

// Unique labels
const uniqueLabels = new Map();
for (const p of specPairs) {
  if (!uniqueLabels.has(p.label)) {
    uniqueLabels.set(p.label, new Set());
  }
  uniqueLabels.get(p.label).add(p.value);
}

// Exclude internal image labels
const ignoreLabels = new Set(['scene7-original', 'snp-excel', 'snp-part', 'excel-fallback', 'main', 'gallery']);

const missingLabels = [];
for (const label of Array.from(uniqueLabels.keys()).sort()) {
  if (ignoreLabels.has(label)) continue;
  const norm = normalizeKey(label);
  const inEn = !!enMap[norm];
  const inRu = !!ruMap[norm];
  const inAz = !!azMap[norm];
  if (!inEn || !inRu || !inAz) {
    missingLabels.push({
      label,
      inAz,
      inEn,
      inRu,
      count: uniqueLabels.get(label).size,
      samples: Array.from(uniqueLabels.get(label)).slice(0, 5)
    });
  }
}

console.log('Total unique labels:', uniqueLabels.size);
console.log('Missing labels count:', missingLabels.length);
console.log('=================== MISSING LABELS ===================');
console.log(JSON.stringify(missingLabels, null, 2));

// Read all values and categorize what values need translation
const allValues = [];
for (const [label, vals] of uniqueLabels.entries()) {
  for (const v of vals) {
    allValues.push({ label, value: v });
  }
}

console.log('Total unique label-value pairs:', allValues.length);
fs.writeFileSync(path.join(WORKSPACE, 'scripts/all_pairs.json'), JSON.stringify(allValues, null, 2));
