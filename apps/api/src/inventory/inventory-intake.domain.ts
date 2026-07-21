const AZERBAIJANI_CHAR_MAP: Record<string, string> = {
  ə: 'e',
  ı: 'i',
  ö: 'o',
  ü: 'u',
  ğ: 'g',
  ç: 'c',
  ş: 's',
  Ə: 'e',
  I: 'i',
  İ: 'i',
  Ö: 'o',
  Ü: 'u',
  Ğ: 'g',
  Ç: 'c',
  Ş: 's',
};

export function slugifyCatalogLabel(value: string) {
  return value
    .trim()
    .split('')
    .map((character) => AZERBAIJANI_CHAR_MAP[character] ?? character)
    .join('')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function catalogNamesMatch(left: string, right: string) {
  return left.trim().toLocaleLowerCase('az') === right.trim().toLocaleLowerCase('az');
}

export function buildIntakeProductSlug(brandName: string, modelName: string) {
  const parts = [brandName.trim(), modelName.trim()].filter((part) => part !== '');
  if (parts.length === 0) {
    return '';
  }
  return slugifyCatalogLabel(parts.join(' '));
}

function intakeToken(value: string) {
  return value
    .trim()
    .split('')
    .map((character) => AZERBAIJANI_CHAR_MAP[character] ?? character)
    .join('')
    .replace(/[^a-zA-Z0-9]/g, '');
}

export function buildIntakeVariantSku(brandName: string, modelName: string) {
  const brandPart = intakeToken(brandName.split(/\s+/)[0] ?? '')
    .toUpperCase()
    .slice(0, 5);
  const modelPart = intakeToken(modelName.split(/\s+/)[0] ?? '')
    .toUpperCase()
    .slice(0, 4);
  if (brandPart === '' || modelPart === '') {
    return '';
  }
  return `${brandPart}-${modelPart}-STD`;
}

export function withIntakeSkuSuffix(baseSku: string, index: number) {
  if (index <= 1) {
    return baseSku;
  }
  return `${baseSku}-${index}`;
}

/** GS1 EAN-13 check digit for the first 12 digits (left to right). */
export function computeEan13CheckDigit(first12: string): number {
  if (first12.length !== 12 || !/^\d+$/.test(first12)) {
    throw new Error('EAN-13 requires exactly 12 numeric digits');
  }
  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    const digit = Number(first12[index]);
    sum += index % 2 === 0 ? digit : digit * 3;
  }
  return (10 - (sum % 10)) % 10;
}

export function buildEan13Barcode(first12: string): string {
  return `${first12}${computeEan13CheckDigit(first12)}`;
}
