const DEFAULT_API_BASE = "http://127.0.0.1:3001/api/v1";

/** Client-side API base: same-origin proxy (see storefront next.config rewrites). */
export const BROWSER_API_BASE = "/api/v1";

export function resolveApiBaseUrl(
  configured = process.env.NEXT_PUBLIC_API_URL,
  windowLike?: Pick<Location, "protocol" | "hostname">,
): string {
  if (windowLike !== undefined) {
    return BROWSER_API_BASE;
  }

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return DEFAULT_API_BASE;
}
