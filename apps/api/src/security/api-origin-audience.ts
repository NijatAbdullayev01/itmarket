/**
 * First-party Origin audience for CSRF/cookie isolation.
 * Storefront may not mutate staff namespaces (and vice versa). Payment provider
 * webhooks must not present a first-party frontend Origin (blocks BFF replay).
 */

export type ApiOriginAudience = 'staff' | 'storefront' | 'webhook' | 'shared';

const STAFF_PREFIXES = [
  'staff',
  'catalog',
  'inventory',
  'orders',
  'pos',
  'cash-register',
  'customers',
  'credit-applications',
  'product-availability-requests',
  'product-reviews',
  'support-messages',
  'reports',
  'audit',
  'fulfillment',
] as const;

const STOREFRONT_PREFIXES = [
  'storefront',
  'customer',
  'payments',
] as const;

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const TRUSTED_FETCH_SITES = new Set(['same-origin', 'same-site', 'none']);

export function apiPathOriginAudience(requestPath: string): ApiOriginAudience {
  let normalized = requestPath.trim();
  if (/^https?:\/\//i.test(normalized)) {
    try {
      normalized = new URL(normalized).pathname;
    } catch {
      // Keep the raw value when URL parsing fails.
    }
  }
  normalized = (normalized.split('?')[0] ?? normalized).trim();
  if (
    normalized.includes('/payments/webhooks/') ||
    normalized.includes('/webhooks/')
  ) {
    return 'webhook';
  }

  const rest = stripVersionedApiPrefix(normalized);
  if (STAFF_PREFIXES.some((prefix) => matchesApiPrefix(rest, prefix))) {
    return 'staff';
  }
  if (STOREFRONT_PREFIXES.some((prefix) => matchesApiPrefix(rest, prefix))) {
    return 'storefront';
  }
  return 'shared';
}

export function isMutationOriginForbidden(input: {
  method: string;
  path: string;
  origin: string | undefined;
  fetchSite: string | undefined;
  storefrontOrigins: ReadonlySet<string>;
  staffOrigins: ReadonlySet<string>;
}): boolean {
  if (SAFE_METHODS.has(input.method.toUpperCase())) {
    return false;
  }

  const audience = apiPathOriginAudience(input.path);
  const origin = input.origin?.trim() ?? '';
  const originMissing = origin.length === 0;
  const fetchSite = input.fetchSite?.trim();
  const allowed = new Set([...input.storefrontOrigins, ...input.staffOrigins]);

  if (audience === 'webhook') {
    return !originMissing && allowed.has(origin);
  }

  if (fetchSite === 'cross-site') {
    return true;
  }
  if (!originMissing && !allowed.has(origin)) {
    return true;
  }
  if (originMissing) {
    return (
      fetchSite === undefined ||
      fetchSite.length === 0 ||
      !TRUSTED_FETCH_SITES.has(fetchSite)
    );
  }
  if (audience === 'staff' && !input.staffOrigins.has(origin)) {
    return true;
  }
  if (audience === 'storefront' && !input.storefrontOrigins.has(origin)) {
    return true;
  }
  return false;
}

function stripVersionedApiPrefix(path: string): string {
  const match = /^\/api\/v\d+\//i.exec(path);
  if (match) {
    return path.slice(match[0].length);
  }
  return path.replace(/^\//, '');
}

function matchesApiPrefix(rest: string, prefix: string): boolean {
  return rest === prefix || rest.startsWith(`${prefix}/`);
}
