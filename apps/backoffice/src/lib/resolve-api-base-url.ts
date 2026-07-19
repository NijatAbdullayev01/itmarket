const DEFAULT_API_BASE = "http://localhost:3001/api/v1";

function isLoopbackHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function resolveApiBaseUrl(
  configured = process.env.NEXT_PUBLIC_API_URL,
  windowLike?: Pick<Location, "protocol" | "hostname">,
): string {
  if (windowLike && isLoopbackHostname(windowLike.hostname)) {
    if (configured) {
      try {
        const configuredUrl = new URL(configured);
        if (
          isLoopbackHostname(configuredUrl.hostname) &&
          configuredUrl.hostname !== windowLike.hostname
        ) {
          configuredUrl.hostname = windowLike.hostname;
          return configuredUrl.toString().replace(/\/$/, "");
        }
      } catch {
        // Fall through to configured/default values below.
      }
    } else {
      return `${windowLike.protocol}//${windowLike.hostname}:3001/api/v1`;
    }
  }

  return configured ?? DEFAULT_API_BASE;
}
