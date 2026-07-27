import type { NextConfig } from "next";
import path from "path";
import { loadEnvConfig } from "@next/env";

import { resolveStorefrontOrigin } from "./src/lib/resolve-storefront-origin";

loadEnvConfig(path.join(__dirname, "../.."));

function apiProxyDestination(): string {
  const origin =
    process.env.API_ORIGIN?.trim().replace(/\/$/, "") ??
    "http://127.0.0.1:3001";
  return `${origin}/api/v1/:path*`;
}

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
      "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'",
  },
  ...(process.env.NODE_ENV === "production"
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
      {
        source: "/api/v1/:path*",
        destination: apiProxyDestination(),
      },
    ];
  },
};

export default nextConfig;
