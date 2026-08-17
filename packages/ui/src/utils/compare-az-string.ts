/**
 * ICU-independent Azerbaijani collation for SSR-safe list order.
 *
 * `String.prototype.localeCompare(..., "az")` can rank Q vs L differently in
 * Node (full ICU: Q before L) and the browser (often Latin: L before Q).
 * Client Components that sort with it then fail hydration — e.g. brand chips
 * rendering QNAP on the server and Lenovo on the client.
 *
 * Official Latin alphabet (plus W for foreign brand names):
 * A B C Ç D E Ə F G Ğ H X I İ J K Q L M N O Ö P R S Ş T U Ü V W Y Z
 */

const AZ_LETTER_GROUPS: readonly (readonly string[])[] = [
  ["A", "a"],
  ["B", "b"],
  ["C", "c"],
  ["Ç", "ç"],
  ["D", "d"],
  ["E", "e"],
  ["Ə", "ə"],
  ["F", "f"],
  ["G", "g"],
  ["Ğ", "ğ"],
  ["H", "h"],
  ["X", "x"],
  ["I", "ı"],
  ["İ", "i"],
  ["J", "j"],
  ["K", "k"],
  ["Q", "q"],
  ["L", "l"],
  ["M", "m"],
  ["N", "n"],
  ["O", "o"],
  ["Ö", "ö"],
  ["P", "p"],
  ["R", "r"],
  ["S", "s"],
  ["Ş", "ş"],
  ["T", "t"],
  ["U", "u"],
  ["Ü", "ü"],
  ["V", "v"],
  ["W", "w"],
  ["Y", "y"],
  ["Z", "z"],
];

const AZ_LETTER_RANK = new Map<string, number>();

for (let index = 0; index < AZ_LETTER_GROUPS.length; index += 1) {
  const rank = index + 1;
  for (const letter of AZ_LETTER_GROUPS[index]!) {
    AZ_LETTER_RANK.set(letter, rank);
  }
}

/** Letter ranks sit above ASCII punctuation/digits so "3M" still sorts first. */
const LETTER_RANK_OFFSET = 200;

function azCharRank(char: string): number {
  const mapped = AZ_LETTER_RANK.get(char);
  if (mapped !== undefined) {
    return LETTER_RANK_OFFSET + mapped;
  }

  const code = char.codePointAt(0) ?? 0;
  return code < 128 ? code : 1000 + code;
}

export function compareAzStrings(left: string, right: string): number {
  const normalizedLeft = left.normalize("NFC");
  const normalizedRight = right.normalize("NFC");
  const leftChars = [...normalizedLeft];
  const rightChars = [...normalizedRight];
  const limit = Math.min(leftChars.length, rightChars.length);

  for (let index = 0; index < limit; index += 1) {
    const delta = azCharRank(leftChars[index]!) - azCharRank(rightChars[index]!);
    if (delta !== 0) {
      return delta;
    }
  }

  if (leftChars.length !== rightChars.length) {
    return leftChars.length - rightChars.length;
  }

  if (normalizedLeft === normalizedRight) {
    return 0;
  }

  return normalizedLeft < normalizedRight ? -1 : 1;
}

export function compareByAzName<T extends { name: string }>(
  left: T,
  right: T,
): number {
  return compareAzStrings(left.name, right.name);
}
