export const DEFAULT_STOREFRONT_PICKUP_LOCATION = {
  id: "2869690c-0000-4000-8000-000000000001",
  name: "28may 69C filialı",
  addressLine: "28 may küçəsi 69C, Bakı",
} as const;

export function resolvePickupLocations<
  T extends { id: string; name: string; addressLine: string },
>(locations: T[]): T[] {
  return locations.length > 0 ? locations : [DEFAULT_STOREFRONT_PICKUP_LOCATION as T];
}
