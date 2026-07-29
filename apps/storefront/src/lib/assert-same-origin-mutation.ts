/**
 * Same-origin gate for cookie-authenticated storefront BFF mutations.
 * Mirrors Nest API Origin / Sec-Fetch-Site policy (app.setup.ts).
 */
export function assertSameOriginMutation(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return false;
  }
  const origin = request.headers.get("origin");
  const originMissing = origin === null || origin.trim() === "";
  if (originMissing) {
    // Origin-less: only trusted browser Sec-Fetch-Site values (not missing).
    return (
      fetchSite === "same-origin" ||
      fetchSite === "same-site" ||
      fetchSite === "none"
    );
  }
  return origin === new URL(request.url).origin;
}
