import { NextRequest, NextResponse } from "next/server";

/**
 * Per-request CSP nonce (Next.js 16 proxy convention).
 * Production drops script-src 'unsafe-inline'. Stylesheets require nonce;
 * style attributes remain allowlisted for dynamic layout (CSP3 split).
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV !== "production";

  const scriptSrc = isDev
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;
  const connectSrc = isDev
    ? "connect-src 'self' ws: wss:"
    : "connect-src 'self'";

  // style-src-elem: only nonced / same-origin stylesheets (no free <style> injection).
  // style-src-attr: React layout uses style=; attribute styles cannot run script in
  // modern browsers — kept until dynamic layout moves fully to CSS classes.
  // Dev mode allows 'unsafe-inline' for HMR style injection during router.refresh().
  const styleSrcElem = isDev
    ? `style-src-elem 'self' 'unsafe-inline'`
    : `style-src-elem 'self' 'nonce-${nonce}'`;
  const styleSrcAttr = "style-src-attr 'unsafe-inline'";
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "style-src 'self'",
    styleSrcElem,
    styleSrcAttr,
    scriptSrc,
    "script-src-attr 'none'",
    connectSrc,
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ]
    .join("; ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
