import "./src/lib/load-env";

import type { NextConfig } from "next";

function apiProxyDestination(): string {
  const origin =
    process.env.API_ORIGIN?.trim().replace(/\/$/, "") ??
    "http://127.0.0.1:3001";
  return `${origin}/api/v1/:path*`;
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

function imageRemotePatterns(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
    {
      protocol: "http",
      hostname: "localhost",
      port: "9000",
      pathname: "/**",
    },
    {
      protocol: "http",
      hostname: "127.0.0.1",
      port: "9000",
      pathname: "/**",
    },
  ];

  const configured = process.env.IMAGE_REMOTE_HOSTS?.trim();
  if (!configured) {
    return patterns;
  }

  for (const entry of configured.split(",")) {
    const host = entry.trim();
    if (!host) {
      continue;
    }
    patterns.push(
      { protocol: "https", hostname: host, pathname: "/**" },
      { protocol: "http", hostname: host, pathname: "/**" },
    );
  }

  return patterns;
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
    remotePatterns: imageRemotePatterns(),
  },
  experimental: {
    // Soft-nav back/forward & revisits reuse the RSC payload instead of
    // refetching every dynamic segment (default dynamic staleTime is 0).
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
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
    return [
      {
        source: "/api/v1/:path*",
        destination: apiProxyDestination(),
      },
    ];
  },
};

export default nextConfig;
