import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  const productionEnvironment = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://user:password@database:5432/itmarket',
    REDIS_URL: 'redis://redis:6379',
    APP_SECRET: 'a-production-secret-with-at-least-32-characters',
    PAYMENT_PROVIDER: 'epoint',
    EPOINT_PUBLIC_KEY: 'i000000001',
    EPOINT_PRIVATE_KEY: 'epoint-private-key',
    EPOINT_INSTALLMENT_MONTHS: '3,6,12',
    EPOINT_INSTALLMENT_MINIMUM: '150.00',
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

  it('accepts merchant-confirmed Epoint installment configuration', () => {
    expect(
      validateEnvironment(productionEnvironment).EPOINT_INSTALLMENT_MONTHS,
    ).toBe('3,6,12');
  });

  it('rejects the mock payment provider in production', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        PAYMENT_PROVIDER: 'mock',
      }),
    ).toThrow('PAYMENT_PROVIDER=mock is forbidden in production');
  });

  it('requires Epoint credentials when the Epoint provider is selected', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        EPOINT_PUBLIC_KEY: undefined,
      }),
    ).toThrow('production requires EPOINT_PUBLIC_KEY');
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        EPOINT_PRIVATE_KEY: undefined,
      }),
    ).toThrow('production requires EPOINT_PRIVATE_KEY');
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

  it('rejects invalid Epoint installment month mappings', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        EPOINT_INSTALLMENT_MONTHS: '3, 3, twelve',
      }),
    ).toThrow(
      'EPOINT_INSTALLMENT_MONTHS must be a comma-separated list of unique integers between 2 and 24',
    );
  });

  it('rejects a non-positive Epoint installment minimum', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        EPOINT_INSTALLMENT_MINIMUM: '0',
      }),
    ).toThrow('EPOINT_INSTALLMENT_MINIMUM must be greater than zero');
  });

  it('rejects missing production secrets and dependencies', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'production' })).toThrow(
      'production requires',
    );
  });
});
