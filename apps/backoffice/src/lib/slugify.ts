const AZERBAIJANI_CHAR_MAP: Record<string, string> = {
  ə: "e",
  ı: "i",
  ö: "o",
  ü: "u",
  ğ: "g",
  ç: "c",
  ş: "s",
  Ə: "e",
  I: "i",
  İ: "i",
  Ö: "o",
  Ü: "u",
  Ğ: "g",
  Ç: "c",
  Ş: "s",
};

export function slugify(value: string) {
  const normalized = value
    .trim()
    .split("")
    .map((character) => AZERBAIJANI_CHAR_MAP[character] ?? character)
    .join("")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized;
}
