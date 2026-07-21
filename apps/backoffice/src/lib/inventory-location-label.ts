import {
  ITMARKET_STORE_28MAY_LOCATION_CODE,
  resolveInventoryLocationDisplayName,
} from "@itmarket/contracts";

const INVENTORY_LOCATION_TYPE_LABEL: Record<string, string> = {
  WAREHOUSE: "Anbar",
  STORE: "Mağaza",
  PICKUP: "Pickup",
};

export type InventoryLocationLike = {
  id?: string;
  code?: string;
  name?: string;
  type?: string;
};

function normalizeLocationType(type: string | undefined) {
  return type?.trim().toUpperCase() ?? "";
}

function resolveInventoryLocationType(
  location: InventoryLocationLike,
  catalog?: InventoryLocationLike[],
): string {
  const direct = normalizeLocationType(location.type);
  if (direct !== "" && INVENTORY_LOCATION_TYPE_LABEL[direct] !== undefined) {
    return direct;
  }

  if (catalog !== undefined) {
    const match =
      (location.id !== undefined
        ? catalog.find((entry) => entry.id === location.id)
        : undefined) ??
      (location.code !== undefined
        ? catalog.find((entry) => entry.code === location.code)
        : undefined);
    if (match !== undefined) {
      const catalogType = normalizeLocationType(match.type);
      if (
        catalogType !== "" &&
        INVENTORY_LOCATION_TYPE_LABEL[catalogType] !== undefined
      ) {
        return catalogType;
      }
    }
  }

  return direct;
}

export function pickDefaultInventoryLocationId(
  locations: InventoryLocationLike[],
): string {
  const canonical = locations.find(
    (entry) =>
      entry.code?.trim().toUpperCase() === ITMARKET_STORE_28MAY_LOCATION_CODE,
  );
  if (canonical?.id !== undefined && canonical.id !== "") {
    return canonical.id;
  }
  return locations[0]?.id ?? "";
}

export function getInventoryLocationLabel(
  location: InventoryLocationLike,
  catalog?: InventoryLocationLike[],
): string {
  const type = resolveInventoryLocationType(location, catalog);
  const typeLabel =
    type !== "" ? INVENTORY_LOCATION_TYPE_LABEL[type] : undefined;
  const name =
    resolveInventoryLocationDisplayName(location) ?? location.name?.trim();

  if (name !== undefined && name !== "") {
    return name;
  }
  if (typeLabel !== undefined) {
    return typeLabel;
  }
  const code = location.code?.trim();
  if (code !== undefined && code !== "") {
    return code;
  }
  return "—";
}
