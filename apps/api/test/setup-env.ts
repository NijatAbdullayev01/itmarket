import { configureTestEnvironment } from './test-env';

configureTestEnvironment();

process.env.STOREFRONT_ORIGIN ??= 'http://localhost:3010';
process.env.BACKOFFICE_ORIGIN ??= 'http://localhost:3002';

/**
 * SuperTest e2e agents do not send browser Origin by default. Production CSRF
 * gate rejects Origin-less mutations without trusted Sec-Fetch-Site. Inject an
 * allowlisted Origin for mutation methods unless the test opts out.
 *
 * Opt out: `.set('X-Test-Omit-Origin', '1')` (header is stripped before send).
 */
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Test = require('supertest/lib/test') as {
    prototype: {
      end: (
        this: {
          method?: string;
          _header?: Record<string, string>;
          set: (field: string, value: string) => unknown;
          unset?: (field: string) => unknown;
        },
        fn?: unknown,
      ) => unknown;
    };
  };
  const originalEnd = Test.prototype.end;
  Test.prototype.end = function patchedEnd(fn?: unknown) {
    const method = (this.method ?? 'GET').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const headers = this._header ?? {};
      const omit =
        headers['x-test-omit-origin'] !== undefined ||
        headers['X-Test-Omit-Origin'] !== undefined;
      const hasOrigin =
        headers.origin !== undefined || headers.Origin !== undefined;
      if (omit) {
        this.unset?.('X-Test-Omit-Origin');
        this.unset?.('x-test-omit-origin');
      } else if (!hasOrigin) {
        this.set(
          'Origin',
          process.env.STOREFRONT_ORIGIN ?? 'http://localhost:3010',
        );
      }
    }
    return originalEnd.call(this, fn);
  };
} catch {
  // Unit tests / environments without supertest ignore the patch.
}
