import type { NextConfig } from "next";

function apiProxyDestination(): string {
  const origin =
    process.env.API_ORIGIN?.trim().replace(/\/$/, "") ??
    "http://127.0.0.1:3001";
  return `${origin}/api/v1/:path*`;
}

const isProd = process.env.NODE_ENV === "production";

/**
 * Webpack/Next dev bundles use eval() + HMR websockets. Without these CSP
 * exceptions in development, React never hydrates and client controls
 * (language switcher, search, cart actions, etc.) appear dead.
 */
const scriptSrc = isProd
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
const connectSrc = isProd
  ? "connect-src 'self'"
  : "connect-src 'self' ws: wss:";

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none",
  },
  {
    key: "Content-Security-Policy",
    value:
      `default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; ${scriptSrc}; ${connectSrc}`,
  },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["@itmarket/ui"],
  // Dev HMR is origin-locked; Cursor/local often open 127.0.0.1 while Next
  // binds as localhost (and vice versa) — without this, client bundles never
  // finish wiring and interactive header controls look dead.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: apiProxyDestination(),
      },
    ];
  },
};

export default nextConfig;
