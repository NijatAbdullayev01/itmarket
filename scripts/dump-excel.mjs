import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const requireFromBackoffice = createRequire(path.join(process.cwd(), 'apps/backoffice/package.json'));
const XLSX = requireFromBackoffice('xlsx');

const { readdirSync } = await import('node:fs');

function matchAem(file) {
  const n = file.normalize('NFC');
  return (
    n.includes('26082026_260812_162518') &&
    n.includes('AEM') &&
    !n.includes('DVR-CAMERA') &&
    n.endsWith('.xlsx')
  );
}

let file = process.argv[2];
if (!file || !file.includes('.xlsx')) {
  const root = process.cwd();
  const found = readdirSync(root).find(matchAem);
  if (!found) throw new Error('AEM xlsx not found');
  file = found;
}
const wb = XLSX.readFile(file, { cellDates: true });
console.log('SHEETS:', wb.SheetNames);

for (const sheetName of wb.SheetNames) {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) continue;
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
  console.log(`\n===== SHEET: ${sheetName} (${matrix.length} rows) =====`);
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i];
    console.log(`--- row ${i} ---`);
    if (Array.isArray(row)) {
      row.forEach((cell, j) => {
        if (cell !== null && cell !== undefined && String(cell).trim() !== '') {
          console.log(`  [${j}] ${String(cell)}`);
        }
      });
    } else {
      console.log(JSON.stringify(row));
    }
  }
}
