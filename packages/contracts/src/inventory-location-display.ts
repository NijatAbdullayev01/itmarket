/** Demo / filial stok məntəqəsi (ST-28MAY) və pickup (28MAY-69C) üçün vahid göstərim. */
export const ITMARKET_STORE_28MAY_LOCATION_CODE = "ST-28MAY";
export const ITMARKET_PICKUP_28MAY_LOCATION_CODE = "28MAY-69C";
export const ITMARKET_STORE_28MAY_DISPLAY_NAME = "28 may küçəsi 69C";

const LEGACY_28MAY_NAMES = new Set(
  ["28 may", "28may 69c filialı", "28may 69c", ITMARKET_STORE_28MAY_DISPLAY_NAME].map(
    (value) => value.toLocaleLowerCase("az"),
  ),
);

export type InventoryLocationNameLike = {
  code?: string | null;
  name?: string | null;
};

function normalizeLocationCode(code: string | null | undefined): string {
  return code?.trim().toUpperCase() ?? "";
}

function isLegacy28MayName(name: string | null | undefined): boolean {
  const trimmed = name?.trim();
  if (trimmed === undefined || trimmed === "") {
    return false;
  }
  return LEGACY_28MAY_NAMES.has(trimmed.toLocaleLowerCase("az"));
}

export function isItmarketStore28MayLocation(
  location: InventoryLocationNameLike,
): boolean {
  const code = normalizeLocationCode(location.code);
  if (
    code === ITMARKET_STORE_28MAY_LOCATION_CODE ||
    code === ITMARKET_PICKUP_28MAY_LOCATION_CODE
  ) {
    return true;
  }
  return isLegacy28MayName(location.name);
}

/** DB/API adını UI və hesabatlar üçün vahid filial ünvanına gətirir. */
export function resolveInventoryLocationDisplayName(
  location: InventoryLocationNameLike,
): string | undefined {
  if (isItmarketStore28MayLocation(location)) {
    return ITMARKET_STORE_28MAY_DISPLAY_NAME;
  }
  const name = location.name?.trim();
  return name === undefined || name === "" ? undefined : name;
}
