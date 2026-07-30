/**
 * Headers for backoffice Next.js route handlers that proxy to Nest.
 *
 * Browser → backoffice requests include Origin / Sec-Fetch-Site. The Node
 * `fetch` hop to the API does not, and API CSRF middleware rejects origin-less
 * mutations (ORIGIN_FORBIDDEN). Forward the browser Origin when present; otherwise
 * mark the hop as same-site so cookie-authenticated server proxies still work.
 */
export function staffApiProxyHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  const cookie = request.headers.get("cookie");
  if (cookie !== null && cookie.trim() !== "") {
    headers.cookie = cookie;
  }

  const origin = request.headers.get("origin");
  if (origin !== null && origin.trim() !== "") {
    headers.origin = origin;
  } else {
    headers["sec-fetch-site"] = "same-site";
  }

  return headers;
}
