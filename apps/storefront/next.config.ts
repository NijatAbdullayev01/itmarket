import "./src/lib/load-env";

import type { NextConfig } from "next";

import {
  buildApiBffRewrites,
  STOREFRONT_API_BFF_PREFIXES,
} from "./src/lib/api-bff-proxy";
import { imageRemotePatterns } from "./src/lib/image-remote-patterns";

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

function imageRemotePatternsFromEnv(): NonNullable<
  NextConfig["images"]
>["remotePatterns"] {
  return imageRemotePatterns(process.env.IMAGE_REMOTE_HOSTS);
}

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["@itmarket/ui"],
  // Hide the bottom-left Next.js DevTools badge (Route / Bundler menu) in
  // local `next dev` so it does not sit under the storefront footer.
  devIndicators: false,
  // Dev HMR is origin-locked; Cursor/local often open 127.0.0.1 while Next
  // binds as localhost (and vice versa) — without this, client bundles never
  // finish wiring and interactive header controls look dead.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: imageRemotePatternsFromEnv(),
  },
  experimental: {
    // Soft-nav back/forward & revisits reuse the RSC payload instead of
    // refetching every dynamic segment (default dynamic staleTime is 0).
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
    // Match backoffice: Nest SEO AI / other slow /api/v1 rewrites exceed the
    // default 30s http-proxy timeout and otherwise surface a plain-text 500.
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
  async redirects() {
    return [
      {
        source: "/shop",
        destination: "/",
        permanent: true,
      },
      {
        source: "/sitemap_index.xml",
        destination: "/sitemap.xml",
        permanent: true,
      },
      {
        source: "/haqqimizda",
        destination: "/about",
        permanent: true,
      },
      {
        source: "/brendler",
        destination: "/",
        permanent: true,
      },
      {
        source: "/my-account",
        destination: "/account",
        permanent: true,
      },
      {
        source: "/wishlist",
        destination: "/favorites",
        permanent: true,
      },
      {
        source: "/product/:path*",
        destination: "/products/:path*",
        permanent: true,
      },
      {
        source: "/product-category/:path*",
        destination: "/categories/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return buildApiBffRewrites(apiProxyOrigin(), STOREFRONT_API_BFF_PREFIXES);
  },
};

export default nextConfig;
