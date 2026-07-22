export type AdministrativeAreaGroup = {
  label: string;
  areas: readonly {
    label: string;
    value: string;
  }[];
};

function slugifyAdministrativeArea(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ğ/g, "g")
    .replace(/ç/g, "c")
    .replace(/ş/g, "s")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function area(label: string, value = slugifyAdministrativeArea(label)) {
  return { label, value };
}

/**
 * İnzibati Ərazi Bölgüsü Təsnifatı, 2024 (Dövlət Statistika Komitəsi).
 * 11 respublika tabeli şəhər, Bakının 12 rayonu, 57 respublika tabeli rayon,
 * Naxçıvan MR-nin 7 rayonu.
 */
export const AZERBAIJAN_ADMINISTRATIVE_AREA_GROUPS: readonly AdministrativeAreaGroup[] =
  [
    {
      label: "Respublika tabeli şəhərlər",
      areas: [
        area("Bakı", "baku"),
        area("Gəncə"),
        area("Xankəndi"),
        area("Lənkəran"),
        area("Mingəçevir"),
        area("Naftalan"),
        area("Sumqayıt"),
        area("Şəki"),
        area("Şirvan"),
        area("Yevlax"),
        area("Naxçıvan"),
      ],
    },
    {
      label: "Bakı şəhərinin rayonları",
      areas: [
        area("Binəqədi"),
        area("Xətai"),
        area("Xəzər"),
        area("Qaradağ"),
        area("Nərimanov"),
        area("Nəsimi"),
        area("Nizami"),
        area("Pirallahı"),
        area("Sabunçu"),
        area("Səbail"),
        area("Suraxanı"),
        area("Yasamal"),
      ],
    },
    {
      label: "Respublika tabeli rayonlar",
      areas: [
        area("Abşeron"),
        area("Ağcabədi"),
        area("Ağdam"),
        area("Ağdaş"),
        area("Ağdərə"),
        area("Ağstafa"),
        area("Ağsu"),
        area("Astara"),
        area("Balakən"),
        area("Beyləqan"),
        area("Bərdə"),
        area("Biləsuvar"),
        area("Cəbrayıl"),
        area("Cəlilabad"),
        area("Daşkəsən"),
        area("Füzuli"),
        area("Gədəbəy"),
        area("Goranboy"),
        area("Göyçay"),
        area("Göygöl"),
        area("Hacıqabul"),
        area("Xaçmaz"),
        area("Xizi"),
        area("Xocalı"),
        area("Xocavənd"),
        area("İmişli"),
        area("İsmayıllı"),
        area("Kəlbəcər"),
        area("Kürdəmir"),
        area("Qax"),
        area("Qazax"),
        area("Qəbələ"),
        area("Qobustan"),
        area("Quba"),
        area("Qubadlı"),
        area("Qusar"),
        area("Laçın"),
        area("Lerik"),
        area("Masallı"),
        area("Neftçala"),
        area("Oğuz"),
        area("Saatlı"),
        area("Sabirabad"),
        area("Salyan"),
        area("Samux"),
        area("Siyəzən"),
        area("Şabran"),
        area("Şamaxı"),
        area("Şəmkir"),
        area("Şuşa"),
        area("Tərtər"),
        area("Tovuz"),
        area("Ucar"),
        area("Yardımlı"),
        area("Zaqatala"),
        area("Zəngilan"),
        area("Zərdab"),
      ],
    },
    {
      label: "Naxçıvan Muxtar Respublikası",
      areas: [
        area("Babək"),
        area("Culfa"),
        area("Kəngərli"),
        area("Ordubad"),
        area("Sədərək"),
        area("Şahbuz"),
        area("Şərur"),
      ],
    },
  ] as const;

export const AZERBAIJAN_ADMINISTRATIVE_AREAS =
  AZERBAIJAN_ADMINISTRATIVE_AREA_GROUPS.flatMap((group) => group.areas);

export const BAKU_CITY_VALUE = "baku";

export const BAKU_DISTRICT_GROUP_LABEL = "Bakı şəhərinin rayonları";

export const REPUBLIC_DISTRICT_GROUP_LABEL = "Respublika tabeli rayonlar";

const BAKU_DISTRICT_GROUP = AZERBAIJAN_ADMINISTRATIVE_AREA_GROUPS.find(
  (group) => group.label === BAKU_DISTRICT_GROUP_LABEL,
);

export const BAKU_DISTRICT_AREAS = BAKU_DISTRICT_GROUP?.areas ?? [];

export const CHECKOUT_ADMINISTRATIVE_AREA_GROUPS =
  AZERBAIJAN_ADMINISTRATIVE_AREA_GROUPS.filter(
    (group) => group.label !== BAKU_DISTRICT_GROUP_LABEL,
  );

function normalizeAdministrativeAreaValue(value: string) {
  return value.trim().toLowerCase();
}

export function findAdministrativeArea(value: string) {
  const normalized = normalizeAdministrativeAreaValue(value);
  if (normalized === "") return undefined;

  return AZERBAIJAN_ADMINISTRATIVE_AREAS.find(
    (area) => area.value === normalized,
  );
}

export function resolveAdministrativeAreaLabel(value: string) {
  const match = findAdministrativeArea(value);
  return match?.label ?? value.trim();
}

export function isBakuCityAdministrativeArea(value: string) {
  return normalizeAdministrativeAreaValue(value) === BAKU_CITY_VALUE;
}

export function isBakuDistrictAdministrativeArea(value: string) {
  const normalized = normalizeAdministrativeAreaValue(value);
  if (normalized === "") return false;

  return BAKU_DISTRICT_AREAS.some((area) => area.value === normalized);
}

export function isBakuAdministrativeArea(value: string) {
  return (
    isBakuCityAdministrativeArea(value) ||
    isBakuDistrictAdministrativeArea(value)
  );
}

export function isRepublicDistrictAdministrativeArea(value: string) {
  const normalized = normalizeAdministrativeAreaValue(value);
  if (normalized === "") return false;

  const group = AZERBAIJAN_ADMINISTRATIVE_AREA_GROUPS.find(
    (entry) => entry.label === REPUBLIC_DISTRICT_GROUP_LABEL,
  );

  return group?.areas.some((area) => area.value === normalized) ?? false;
}

export function resolveCheckoutMainAdministrativeArea(value: string) {
  return isBakuDistrictAdministrativeArea(value)
    ? BAKU_CITY_VALUE
    : value.trim();
}

export function resolveCheckoutBakuDistrictAdministrativeArea(value: string) {
  return isBakuDistrictAdministrativeArea(value) ? value.trim() : "";
}
