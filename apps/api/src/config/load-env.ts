import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseEnv } from 'dotenv';

/**
 * Nest ConfigModule only assigns keys that are missing from process.env
 * (`!(key in process.env)`). Turbo / nest --watch children inherit a stale
 * parent environ, so editing the monorepo `.env` (e.g. SEO_AI_TIMEOUT_MS)
 * would otherwise be ignored until a full shell restart.
 *
 * Import this module first from main/worker entrypoints.
 *
 * Production: never override platform/secret-manager values already present in
 * process.env (file wins only for unset keys). Non-production: file overrides
 * so local `.env` edits apply under Turbo watch — except listen/origin keys
 * already set by `pnpm dev` (parallel stack on 4000/4002/4010).
 */
const PARALLEL_DEV_BIND_KEYS = new Set([
  'PORT',
  'API_ORIGIN',
  'STOREFRONT_ORIGIN',
  'BACKOFFICE_ORIGIN',
  'NEXT_PUBLIC_API_URL',
]);

const PARALLEL_DEV_ORIGIN_DEFAULTS: Record<string, string> = {
  STOREFRONT_ORIGIN: 'http://localhost:4010',
  BACKOFFICE_ORIGIN: 'http://localhost:4002',
  NEXT_PUBLIC_API_URL: 'http://localhost:4000/api/v1',
};

function originUsesPort(
  value: string | undefined,
  port: string,
): boolean {
  if (value === undefined || value.trim() === '') {
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
    originUsesPort(process.env.API_ORIGIN, '4000') ||
    originUsesPort(process.env.NEXT_PUBLIC_API_URL, '4000')
  );
}

function shouldKeepExistingEnv(key: string, production: boolean): boolean {
  if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
    return false;
  }
  return production || PARALLEL_DEV_BIND_KEYS.has(key);
}

function applyParallelDevOriginDefaults(): void {
  if (isProductionRuntime() || !isParallelDevApiBound()) {
    return;
  }
  for (const [key, value] of Object.entries(PARALLEL_DEV_ORIGIN_DEFAULTS)) {
    if (process.env[key]?.trim()) {
      continue;
    }
    process.env[key] = value;
  }
}

function resolveEnvCandidates(): string[] {
  return [
    resolve(process.cwd(), '../../.env'),
    resolve(process.cwd(), '.env'),
    // dist/config/load-env.js → repo root
    resolve(__dirname, '../../../../.env'),
  ];
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function loadMonorepoEnv(): void {
  const production = isProductionRuntime();
  const seen = new Set<string>();
  for (const envPath of resolveEnvCandidates()) {
    if (seen.has(envPath) || !existsSync(envPath)) {
      continue;
    }
    seen.add(envPath);
    const parsed = parseEnv(readFileSync(envPath));
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== 'string') {
        continue;
      }
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
