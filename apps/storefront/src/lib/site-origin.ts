const CANONICAL_LOCAL_ORIGIN = "http://localhost:3010";
const PARALLEL_DEV_LOCAL_ORIGIN = "http://localhost:4010";

function originUsesPort(value: string | undefined, port: string): boolean {
  if (value === undefined || value.trim() === "") {
    return false;
  }
  try {
    return new URL(value).port === port;
  } catch {
    return false;
  }
}

function isParallelDevApiBound(): boolean {
  return (
    originUsesPort(process.env.API_ORIGIN, "4000") ||
    originUsesPort(process.env.NEXT_PUBLIC_API_URL, "4000")
  );
}

/**
 * `pnpm dev` talks to the API on :4000 and serves the shop on :4010.
 * Canonical `.env` still lists :3010 — only use that when the API bind is
 * not the parallel-dev port.
 */
function defaultLocalOrigin(): string {
  return isParallelDevApiBound()
    ? PARALLEL_DEV_LOCAL_ORIGIN
    : CANONICAL_LOCAL_ORIGIN;
}

function remapCanonicalOriginToParallelDev(origin: string): string {
  if (process.env.NODE_ENV === "production" || !isParallelDevApiBound()) {
    return origin;
  }
  try {
    const url = new URL(origin);
    const loopback =
      url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (!loopback || url.port !== "3010") {
      return origin;
    }
    return `${url.protocol}//${url.hostname}:4010`;
  } catch {
    return origin;
  }
}

export function getStorefrontOrigin(): URL | null {
  const configuredOrigin = process.env.STOREFRONT_ORIGIN?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (!configuredOrigin) {
    return isProduction ? null : new URL(defaultLocalOrigin());
  }

  try {
    const url = new URL(configuredOrigin);
    const isHttp = url.protocol === "http:" || url.protocol === "https:";
    const isOriginOnly =
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password;

    if (
      !isHttp ||
      !isOriginOnly ||
      (isProduction && url.protocol !== "https:")
    ) {
      return isProduction ? null : new URL(defaultLocalOrigin());
    }

    return new URL(remapCanonicalOriginToParallelDev(url.origin));
  } catch {
    return isProduction ? null : new URL(defaultLocalOrigin());
  }
}

export function resolveStorefrontOrigin(
  configured = process.env.STOREFRONT_ORIGIN,
): string {
  const trimmed = configured?.trim().replace(/\/$/, "");
  if (trimmed) {
    try {
      return remapCanonicalOriginToParallelDev(new URL(trimmed).origin);
    } catch {
      return trimmed;
    }
  }
  const parsed = getStorefrontOrigin();
  if (parsed) {
    return parsed.origin;
  }
  return defaultLocalOrigin();
}
