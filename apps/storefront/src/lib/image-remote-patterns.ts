type ImageRemotePattern = {
  protocol?: "http" | "https";
  hostname: string;
  port?: string;
  pathname?: string;
};

const LOCAL_MINIO_PATTERNS: ImageRemotePattern[] = [
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

function isUnsafeImageRemoteHost(host: string, production: boolean): boolean {
  const hostname = host.trim().toLowerCase();
  if (hostname.length === 0 || hostname.includes("*") || hostname.includes("/")) {
    return true;
  }
  if (!production) {
    return false;
  }
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) ||
    hostname.includes(":")
  ) {
    return true;
  }
  return false;
}

/**
 * next/image remotePatterns. Production never allowlists plaintext HTTP for
 * configured CDN hosts (blocks image-optimizer SSRF to internal HTTP).
 */
export function imageRemotePatterns(
  configuredHosts: string | undefined,
  nodeEnv = process.env.NODE_ENV,
): ImageRemotePattern[] {
  const production = nodeEnv === "production";
  const patterns = [...LOCAL_MINIO_PATTERNS];
  const configured = configuredHosts?.trim();
  if (!configured) {
    return patterns;
  }

  for (const entry of configured.split(",")) {
    const host = entry.trim();
    if (isUnsafeImageRemoteHost(host, production)) {
      continue;
    }
    patterns.push({ protocol: "https", hostname: host, pathname: "/**" });
    if (!production) {
      patterns.push({ protocol: "http", hostname: host, pathname: "/**" });
    }
  }

  return patterns;
}
