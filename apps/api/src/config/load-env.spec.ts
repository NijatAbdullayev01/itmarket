import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('loadMonorepoEnv', () => {
  const originalEnv = { ...process.env };
  const originalCwd = process.cwd();

  afterEach(() => {
    process.chdir(originalCwd);
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
    jest.resetModules();
  });

  it('overrides stale process.env values from .env file outside production', () => {
    const dir = mkdtempSync(join(tmpdir(), 'seo-env-'));
    writeFileSync(
      join(dir, '.env'),
      'SEO_AI_TIMEOUT_MS=30000\nSEO_AI_MODEL=gemini-3.5-flash\n',
      'utf8',
    );
    process.chdir(dir);
    process.env.NODE_ENV = 'development';
    process.env.SEO_AI_TIMEOUT_MS = '12000';
    process.env.SEO_AI_MODEL = 'stale-model';

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { loadMonorepoEnv } = require('./load-env') as typeof import('./load-env');
    loadMonorepoEnv();

    expect(process.env.SEO_AI_TIMEOUT_MS).toBe('30000');
    expect(process.env.SEO_AI_MODEL).toBe('gemini-3.5-flash');
    expect(existsSync(join(dir, '.env'))).toBe(true);
  });

  it('does not override listen/origin keys already set for parallel-dev', () => {
    const dir = mkdtempSync(join(tmpdir(), 'seo-env-ports-'));
    writeFileSync(
      join(dir, '.env'),
      [
        'PORT=3001',
        'API_ORIGIN=http://localhost:3001',
        'STOREFRONT_ORIGIN=http://localhost:3010',
        'BACKOFFICE_ORIGIN=http://localhost:3002',
        'SEO_AI_MODEL=from-file',
      ].join('\n'),
      'utf8',
    );
    process.chdir(dir);
    process.env.NODE_ENV = 'development';
    process.env.PORT = '4000';
    process.env.API_ORIGIN = 'http://localhost:4000';
    process.env.STOREFRONT_ORIGIN = 'http://localhost:4010';
    process.env.BACKOFFICE_ORIGIN = 'http://localhost:4002';
    process.env.SEO_AI_MODEL = 'stale-model';

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { loadMonorepoEnv } = require('./load-env') as typeof import('./load-env');
    loadMonorepoEnv();

    expect(process.env.PORT).toBe('4000');
    expect(process.env.API_ORIGIN).toBe('http://localhost:4000');
    expect(process.env.STOREFRONT_ORIGIN).toBe('http://localhost:4010');
    expect(process.env.BACKOFFICE_ORIGIN).toBe('http://localhost:4002');
    expect(process.env.SEO_AI_MODEL).toBe('from-file');
  });

  it('does not override existing process.env keys in production', () => {
    const dir = mkdtempSync(join(tmpdir(), 'seo-env-prod-'));
    writeFileSync(
      join(dir, '.env'),
      'APP_SECRET=file-secret-should-not-win-0123456789\nSEO_AI_MODEL=from-file\n',
      'utf8',
    );
    process.chdir(dir);
    process.env.NODE_ENV = 'production';
    process.env.APP_SECRET = 'platform-secret-manager-value-0123456789';
    delete process.env.SEO_AI_MODEL;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { loadMonorepoEnv } = require('./load-env') as typeof import('./load-env');
    loadMonorepoEnv();

    expect(process.env.APP_SECRET).toBe(
      'platform-secret-manager-value-0123456789',
    );
    expect(process.env.SEO_AI_MODEL).toBe('from-file');
  });
});
