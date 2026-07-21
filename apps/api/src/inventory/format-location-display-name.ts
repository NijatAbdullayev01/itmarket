import { resolveInventoryLocationDisplayName } from '@itmarket/contracts';

type LocationNameFields = {
  code: string;
  name: string;
};

export function withCanonicalLocationName<T extends LocationNameFields>(
  location: T,
): T {
  const canonical = resolveInventoryLocationDisplayName(location);
  if (canonical === undefined || canonical === location.name) {
    return location;
  }
  return { ...location, name: canonical };
}
