import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  const productionEnvironment = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://user:password@database:5432/itmarket',
    REDIS_URL: 'redis://:redis-password@redis:6379',
    APP_SECRET: 'a-production-secret-with-at-least-32-characters',
    PAYMENT_PROVIDER: 'epoint',
    EPOINT_PUBLIC_KEY: 'i000000001',
    EPOINT_PRIVATE_KEY: 'epoint-private-key',
    EPOINT_INSTALLMENT_MONTHS: '3,6,12',
    EPOINT_INSTALLMENT_MINIMUM: '150.00',
    STOREFRONT_ORIGIN: 'https://shop.example.test',
    BACKOFFICE_ORIGIN: 'https://staff.example.test',
    METRICS_TOKEN: 'a-production-metrics-token-at-least-32-characters',
    SMTP_HOST: 'smtp.example.test',
    SMTP_PORT: 587,
    SMTP_SECURE: true,
    SMTP_USER: 'smtp-user',
    SMTP_PASS: 'smtp-pass',
    EMAIL_FROM: 'ITMarket <no-reply@example.test>',
    MEDIA_STORAGE: 's3',
    S3_ENDPOINT: 'https://s3.example.test',
    S3_REGION: 'eu-central-1',
    S3_ACCESS_KEY: 'production-s3-access-key',
    S3_SECRET_KEY: 'production-s3-secret-key-value',
    S3_BUCKET: 'itmarket-media',
    S3_FORCE_PATH_STYLE: true,
    STAFF_MFA_REQUIRED: true,
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

  it('rejects example and default APP_SECRET values in production', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        APP_SECRET: 'development-only-secret-change-me',
      }),
    ).toThrow('A production APP_SECRET must be explicitly configured');
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        APP_SECRET: 'local_application_secret_change_me_123456',
      }),
    ).toThrow('A production APP_SECRET must be explicitly configured');
  });

  it('rejects the log fiscal receipt provider in production', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        FISCAL_RECEIPT_PROVIDER: 'log',
      }),
    ).toThrow(
      'FISCAL_RECEIPT_PROVIDER=log is forbidden in production (rehearsal-only)',
    );
  });

  it('allows FISCAL_RECEIPT_PROVIDER=none in production until D-010', () => {
    expect(
      validateEnvironment({
        ...productionEnvironment,
        FISCAL_RECEIPT_PROVIDER: 'none',
      }).FISCAL_RECEIPT_PROVIDER,
    ).toBe('none');
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

  it('rejects production Redis URLs without a password', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        REDIS_URL: 'redis://redis:6379',
      }),
    ).toThrow('REDIS_URL must include a password');
  });

  it('rejects production without staff MFA required', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        STAFF_MFA_REQUIRED: false,
      }),
    ).toThrow('STAFF_MFA_REQUIRED must be true in production');
  });

  it('rejects production SMTP without TLS and credentials', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        SMTP_SECURE: false,
      }),
    ).toThrow('SMTP_SECURE must be true in production');
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        SMTP_USER: undefined,
      }),
    ).toThrow('SMTP_USER is required in production');
  });

  it('defaults MEDIA_STORAGE to local outside production', () => {
    expect(
      validateEnvironment({
        NODE_ENV: 'development',
      }).MEDIA_STORAGE,
    ).toBe('local');
  });

  it('defaults MEDIA_MALWARE_SCAN to local and accepts clamav', () => {
    expect(
      validateEnvironment({
        NODE_ENV: 'development',
      }).MEDIA_MALWARE_SCAN,
    ).toBe('local');
    expect(
      validateEnvironment({
        ...productionEnvironment,
        MEDIA_MALWARE_SCAN: 'clamav',
        CLAMAV_HOST: 'clamav.internal',
        CLAMAV_PORT: 3310,
      }).MEDIA_MALWARE_SCAN,
    ).toBe('clamav');
  });

  it('rejects local media storage in production', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        MEDIA_STORAGE: 'local',
      }),
    ).toThrow('MEDIA_STORAGE=local is forbidden in production');
  });

  it('rejects localhost S3 endpoint in production', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        S3_ENDPOINT: 'http://localhost:9000',
      }),
    ).toThrow('A production S3_ENDPOINT must not point at localhost');
  });

  it('defaults STAFF_MFA_REQUIRED to false and accepts explicit true', () => {
    expect(
      validateEnvironment({
        NODE_ENV: 'development',
      }).STAFF_MFA_REQUIRED,
    ).toBe(false);
    expect(
      validateEnvironment({
        ...productionEnvironment,
        STAFF_MFA_REQUIRED: 'true',
      }).STAFF_MFA_REQUIRED,
    ).toBe(true);
  });

  it('defaults JOBS_ENABLED to true and accepts explicit false', () => {
    expect(
      validateEnvironment({
        NODE_ENV: 'development',
      }).JOBS_ENABLED,
    ).toBe(true);
    expect(
      validateEnvironment({
        ...productionEnvironment,
        JOBS_ENABLED: 'false',
      }).JOBS_ENABLED,
    ).toBe(false);
  });
});
