import { config as loadEnvironment } from 'dotenv';
import { resolve } from 'node:path';

const ROOT_ENV_PATH = resolve(__dirname, '../../../.env');
const DEFAULT_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/itmarket';
const DEFAULT_REDIS_URL = 'redis://localhost:6379/0';
const DEFAULT_APP_SECRET = 'integration-test-secret-at-least-32-characters';
const DEFAULT_METRICS_TOKEN =
  'integration-metrics-token-at-least-32-characters';
const DEFAULT_RELEASE_SHA = 'abcdef1';

export interface TestEnvironmentConfig {
  adminDatabaseUrl: string;
  baseDatabaseUrl: string;
  databaseName: string;
  databaseUrl: string;
  redisUrl: string;
}

export function configureTestEnvironment(): TestEnvironmentConfig {
  loadEnvironment({ path: ROOT_ENV_PATH, quiet: true });

  const baseDatabaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
  const databaseUrl = deriveTestDatabaseUrl(baseDatabaseUrl);
  const redisUrl = deriveTestRedisUrl(
    process.env.REDIS_URL ?? DEFAULT_REDIS_URL,
  );
  const databaseName = new URL(databaseUrl).pathname.slice(1);

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = databaseUrl;
  process.env.REDIS_URL = redisUrl;
  process.env.APP_SECRET ??= DEFAULT_APP_SECRET;
  process.env.PAYMENT_PROVIDER ??= 'mock';
  process.env.RELEASE_SHA ??= DEFAULT_RELEASE_SHA;
  process.env.METRICS_TOKEN ??= DEFAULT_METRICS_TOKEN;

  return {
    adminDatabaseUrl: deriveAdminDatabaseUrl(databaseUrl),
    baseDatabaseUrl,
    databaseName,
    databaseUrl,
    redisUrl,
  };
}

function deriveTestDatabaseUrl(source: string): string {
  const url = new URL(source);
  const baseName = url.pathname.slice(1) || 'itmarket';
  const testName = /(?:_ci|_test)$/.test(baseName)
    ? baseName
    : `${baseName}_test`;

  url.pathname = `/${testName}`;
  return url.toString();
}

function deriveAdminDatabaseUrl(source: string): string {
  const url = new URL(source);
  url.pathname = '/postgres';
  url.searchParams.delete('schema');
  return url.toString();
}

function deriveTestRedisUrl(source: string): string {
  const url = new URL(source);
  const dbName = url.pathname.replace(/^\//, '');
  const dbIndex = Number.parseInt(dbName || '0', 10);
  const testIndex = Number.isNaN(dbIndex) ? 1 : dbIndex + 1;

  url.pathname = `/${testIndex}`;
  return url.toString();
}
