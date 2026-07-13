import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  const productionEnvironment = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://user:password@database:5432/itmarket',
    REDIS_URL: 'redis://redis:6379',
    APP_SECRET: 'a-production-secret-with-at-least-32-characters',
    PAYMENT_PROVIDER: 'epoint',
    STOREFRONT_ORIGIN: 'https://shop.example.test',
    BACKOFFICE_ORIGIN: 'https://staff.example.test',
    METRICS_TOKEN: 'a-production-metrics-token-at-least-32-characters',
  };

  it('accepts explicit production configuration', () => {
    expect(validateEnvironment(productionEnvironment).NODE_ENV).toBe(
      'production',
    );
  });

  it('accepts a git SHA release marker when provided', () => {
    expect(
      validateEnvironment({
        ...productionEnvironment,
        RELEASE_SHA: 'a1b2c3d4',
      }).RELEASE_SHA,
    ).toBe('a1b2c3d4');
  });

  it('rejects the mock payment provider in production', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        PAYMENT_PROVIDER: 'mock',
      }),
    ).toThrow('PAYMENT_PROVIDER=mock is forbidden in production');
  });

  it('rejects insecure production frontend origins', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        STOREFRONT_ORIGIN: 'http://shop.example.test',
      }),
    ).toThrow('STOREFRONT_ORIGIN must be an HTTPS origin');
  });

  it('rejects invalid release SHA values', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        RELEASE_SHA: 'release-123',
      }),
    ).toThrow('RELEASE_SHA must be a 7-64 character hex git SHA');
  });

  it('rejects missing production secrets and dependencies', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'production' })).toThrow(
      'production requires',
    );
  });
});
