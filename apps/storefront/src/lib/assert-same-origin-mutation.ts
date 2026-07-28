/**
 * Same-origin gate for cookie-authenticated storefront BFF mutations.
 * Mirrors Nest API Origin / Sec-Fetch-Site policy.
 */
export function assertSameOriginMutation(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return false;
  }
  const origin = request.headers.get("origin");
  if (origin === null || origin.trim() === "") {
    return (
      fetchSite === null ||
      fetchSite === "same-origin" ||
      fetchSite === "same-site" ||
      fetchSite === "none"
    );
  }
  return origin === new URL(request.url).origin;
}
