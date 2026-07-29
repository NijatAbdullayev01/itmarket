import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Next.js only auto-loads `apps/storefront/.env*`. Turbo/dev often runs with a
 * stale process env, so SEO keys in the monorepo root `.env` (TWITTER_SITE,
 * GOOGLE_SITE_VERIFICATION, STORE_GEO_*) never reach generateMetadata.
 *
 * Import from `next.config.ts` (and keep side-effect call) so server runtime
 * sees the same values as local API.
 */
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
      if (production && Object.prototype.hasOwnProperty.call(process.env, key)) {
        continue;
      }
      process.env[key] = value;
    }
  }
}

loadMonorepoEnv();
