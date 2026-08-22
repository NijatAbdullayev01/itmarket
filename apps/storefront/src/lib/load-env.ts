import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Next.js only auto-loads `apps/storefront/.env*`. Turbo/dev often runs with a
 * stale process env, so SEO keys in the monorepo root `.env` (TWITTER_SITE,
 * GOOGLE_SITE_VERIFICATION, STORE_GEO_*) never reach generateMetadata.
 *
 * Import from `next.config.ts` (and keep side-effect call) so server runtime
 * sees the same values as local API.
 *
 * Listen/origin keys already set by `pnpm dev` (4000/4002/4010) must not be
 * overwritten by the shared production `.env` (3001/3002/3010).
 */
const PARALLEL_DEV_BIND_KEYS = new Set([
  "PORT",
  "API_ORIGIN",
  "STOREFRONT_ORIGIN",
  "BACKOFFICE_ORIGIN",
  "NEXT_PUBLIC_API_URL",
]);

const PARALLEL_DEV_ORIGIN_DEFAULTS: Record<string, string> = {
  STOREFRONT_ORIGIN: "http://localhost:4010",
  BACKOFFICE_ORIGIN: "http://localhost:4002",
  NEXT_PUBLIC_API_URL: "http://localhost:4000/api/v1",
};

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

function shouldKeepExistingEnv(key: string, production: boolean): boolean {
  if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
    return false;
  }
  return production || PARALLEL_DEV_BIND_KEYS.has(key);
}

function applyParallelDevOriginDefaults(): void {
  if (process.env.NODE_ENV === "production" || !isParallelDevApiBound()) {
    return;
  }
  for (const [key, value] of Object.entries(PARALLEL_DEV_ORIGIN_DEFAULTS)) {
    if (process.env[key]?.trim()) {
      continue;
    }
    process.env[key] = value;
  }
}

function parseEnvFile(contents: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const rawLine of contents.split(/\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

function resolveEnvCandidates(): string[] {
  return [
    resolve(process.cwd(), "../../.env"),
    resolve(process.cwd(), ".env"),
  ];
}

export function loadMonorepoEnv(): void {
  const production = process.env.NODE_ENV === "production";
  const seen = new Set<string>();
  for (const envPath of resolveEnvCandidates()) {
    if (seen.has(envPath) || !existsSync(envPath)) {
      continue;
    }
    seen.add(envPath);
    const parsed = parseEnvFile(readFileSync(envPath, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (shouldKeepExistingEnv(key, production)) {
        continue;
      }
      if (
        !production &&
        PARALLEL_DEV_BIND_KEYS.has(key) &&
        isParallelDevApiBound()
      ) {
        continue;
      }
      process.env[key] = value;
    }
  }
  applyParallelDevOriginDefaults();
}

loadMonorepoEnv();
