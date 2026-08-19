/**
 * Same-origin BFF rewrite allowlist. Backoffice must not proxy customer
 * checkout, public payment webhooks, or observability scrape endpoints.
 */
export const BACKOFFICE_API_BFF_PREFIXES = [
  "staff",
  "catalog",
  "inventory",
  "orders",
  "pos",
  "cash-register",
  "customers",
  "credit-applications",
  "product-availability-requests",
  "product-reviews",
  "support-messages",
  "reports",
  "audit",
  "fulfillment",
] as const;

export function buildApiBffRewrites(
  apiOrigin: string,
  prefixes: readonly string[],
): Array<{ source: string; destination: string }> {
  const origin = apiOrigin.replace(/\/$/, "");
  return prefixes.map((prefix) => ({
    source: `/api/v1/${prefix}/:path*`,
    destination: `${origin}/api/v1/${prefix}/:path*`,
  }));
}

export function isBackofficeBffProxyPath(pathname: string): boolean {
  const rest = pathname.replace(/^\/api\/v1\/?/i, "");
  return BACKOFFICE_API_BFF_PREFIXES.some(
    (prefix) => rest === prefix || rest.startsWith(`${prefix}/`),
  );
}
