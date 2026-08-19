/**
 * Same-origin BFF rewrite allowlist. Storefront must not proxy staff, webhook,
 * metrics, or other namespaces that do not belong on the public shop origin.
 */
export const STOREFRONT_API_BFF_PREFIXES = [
  "storefront",
  "customer",
  "payments/options",
  "payments/attempts",
  "payments/mock/attempts",
  "payments/orders",
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

export function isStorefrontBffProxyPath(pathname: string): boolean {
  const rest = pathname.replace(/^\/api\/v1\/?/i, "");
  return STOREFRONT_API_BFF_PREFIXES.some(
    (prefix) => rest === prefix || rest.startsWith(`${prefix}/`),
  );
}
