import type { NextConfig } from "next";
import path from "path";
import { loadEnvConfig } from "@next/env";

import { resolveStorefrontOrigin } from "./src/lib/resolve-storefront-origin";
import {
  BACKOFFICE_API_BFF_PREFIXES,
  buildApiBffRewrites,
} from "./src/lib/api-bff-proxy";

loadEnvConfig(path.join(__dirname, "../.."));

function apiProxyOrigin(): string {
  return (
    process.env.API_ORIGIN?.trim().replace(/\/$/, "") ?? "http://127.0.0.1:3001"
  );
}

const isProd = process.env.NODE_ENV === "production";

/**
 * Non-CSP security headers. Content-Security-Policy is set per-request with a
 * nonce in `src/proxy.ts` (Next.js 16 proxy convention).
 */
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
  // binds as localhost (and vice versa).
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    // Default rewrite proxyTimeout is 30s. Catalog «AI ilə SEO yaz» waits up to
    // SEO_AI_TIMEOUT_MS (30s, max 60s) for Gemini; a 30s proxy aborts with a
    // plain-text 500 that the UI shows as "API xətası (500)".
    proxyTimeout: 120_000,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    const storefrontOrigin = resolveStorefrontOrigin();
    return [
      {
        source: "/images/catalog/:path*",
        destination: `${storefrontOrigin}/images/catalog/:path*`,
      },
      {
        source: "/images/brands/:path*",
        destination: `${storefrontOrigin}/images/brands/:path*`,
      },
      {
        source: "/images/hero/:path*",
        destination: `${storefrontOrigin}/images/hero/:path*`,
      },
      ...buildApiBffRewrites(apiProxyOrigin(), BACKOFFICE_API_BFF_PREFIXES),
    ];
  },
};

export default nextConfig;
