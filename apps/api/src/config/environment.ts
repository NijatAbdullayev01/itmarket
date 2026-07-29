import { z } from 'zod';

import { assertSafeSeoAiBaseUrl } from '../security/outbound-url';

const paymentProviderSchema = z.enum(['mock', 'epoint']);
const fiscalReceiptProviderSchema = z.enum(['none', 'log']).default('none');
const mediaStorageSchema = z.enum(['local', 's3']);
/** D-013: local = magic/structure/polyglot; clamav = local + clamd INSTREAM. */
const mediaMalwareScanSchema = z.enum(['local', 'clamav']);
const decimalAmountSchema = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,2})?$/, 'must be a positive decimal amount');
const booleanFlagSchema = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((value) => value === true || value === 'true' || value === '1');

/** Secrets that must never be used in production (defaults / .env.example). */
const FORBIDDEN_PRODUCTION_APP_SECRETS = new Set([
  'development-only-secret-change-me',
  'local_application_secret_change_me_123456',
  'change-me',
  'changeme',
  'secret',
  'password',
]);

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
    DATABASE_URL: z
      .string()
      .url()
      .default('postgresql://postgres:postgres@localhost:5432/itmarket'),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
    APP_SECRET: z.string().min(32).default('development-only-secret-change-me'),
    /**
     * Express `trust proxy` hop count for client IP (rate limits).
     * Default 0 ignores X-Forwarded-For (safe when the API is exposed directly).
     * Behind one reverse proxy set 1. Production requires an explicit value.
     */
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
    PAYMENT_PROVIDER: paymentProviderSchema.default('mock'),
    FISCAL_RECEIPT_PROVIDER: fiscalReceiptProviderSchema,
    EPOINT_PUBLIC_KEY: z.string().trim().min(1).optional(),
    EPOINT_PRIVATE_KEY: z.string().trim().min(1).optional(),
    EPOINT_INSTALLMENT_MONTHS: z.string().trim().min(1).optional(),
    EPOINT_INSTALLMENT_MINIMUM: decimalAmountSchema.optional(),
    /**
     * Extra hosts allowed for provider checkout redirects (comma-separated).
     * `epoint.az` / `www.epoint.az` are always allowed when using Epoint.
     */
    PAYMENT_REDIRECT_HOSTS: z.string().trim().min(1).optional(),
    STOREFRONT_ORIGIN: z.string().url().default('http://localhost:3010'),
    BACKOFFICE_ORIGIN: z.string().url().default('http://localhost:3002'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    RELEASE_SHA: z
      .string()
      .trim()
      .regex(
        /^[a-f0-9]{7,64}$/i,
        'RELEASE_SHA must be a 7-64 character hex git SHA',
      )
      .optional(),
    METRICS_TOKEN: z.string().min(32).optional(),
    SMTP_HOST: z.string().trim().min(1).default('localhost'),
    SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(1025),
    SMTP_SECURE: booleanFlagSchema.default(false),
    SMTP_USER: z.string().trim().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),
    EMAIL_FROM: z
      .string()
      .trim()
      .min(3)
      .default('ITMarket Local <no-reply@itmarket.local>'),
    MEDIA_STORAGE: mediaStorageSchema.optional(),
    /**
     * D-013 malware gate. Default `local` (magic-byte + structure + trailing
     * polyglot). Set `clamav` when clamd is reachable (CLAMAV_HOST/PORT).
     */
    MEDIA_MALWARE_SCAN: mediaMalwareScanSchema.default('local'),
    CLAMAV_HOST: z.string().trim().min(1).default('127.0.0.1'),
    CLAMAV_PORT: z.coerce.number().int().min(1).max(65_535).default(3310),
    S3_ENDPOINT: z.string().trim().url().default('http://localhost:9000'),
    S3_REGION: z.string().trim().min(1).default('us-east-1'),
    S3_ACCESS_KEY: z.string().trim().min(1).default('itmarket_local'),
    S3_SECRET_KEY: z
      .string()
      .min(1)
      .default('local_itmarket_minio_only_ChangeOutsideLocal'),
    S3_BUCKET: z.string().trim().min(1).default('itmarket-local'),
    S3_FORCE_PATH_STYLE: booleanFlagSchema.default(true),
    /** When true, staff login requires mfaEnabled (D-011; default optional). */
    STAFF_MFA_REQUIRED: booleanFlagSchema.default(false),
    /**
     * When true, JobsService schedules payment expiry / notification outbox /
     * report export timers. Production API should set false and run
     * `node dist/worker.js` separately with JOBS_ENABLED=true.
     */
    JOBS_ENABLED: booleanFlagSchema.default(true),
    /**
     * Optional Gemini (or other OpenAI-compatible) API key for catalog SEO
     * suggestions only. When unset, the API returns deterministic heuristic SEO.
     * Never reuse payment/provider secrets here; SEO AI is an isolated egress.
     * Default base URL is Gemini's OpenAI-compatible endpoint.
     */
    SEO_AI_API_KEY: z.string().trim().min(1).optional(),
    SEO_AI_BASE_URL: z
      .string()
      .trim()
      .url()
      .default('https://generativelanguage.googleapis.com/v1beta/openai'),
    SEO_AI_MODEL: z.string().trim().min(1).default('gemini-3.5-flash'),
    /**
     * Gemini often needs 10–20s for multi-sentence AZ page copy.
     * 12s caused frequent AbortError → silent heuristic fallback.
     */
    SEO_AI_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(1_000)
      .max(60_000)
      .default(30_000),
    /**
     * Staff session idle timeout (absolute SESSION_TTL still applies).
     * Default 30 minutes of inactivity.
     */
    STAFF_INACTIVITY_TTL_MS: z.coerce
      .number()
      .int()
      .min(60_000)
      .max(24 * 60 * 60 * 1000)
      .default(30 * 60 * 1000),
    /**
     * Max age for signed payment webhook events (mock occurredAt / Epoint ts).
     * Default 15 minutes.
     */
    WEBHOOK_MAX_AGE_SECONDS: z.coerce
      .number()
      .int()
      .min(60)
      .max(86_400)
      .default(900),
  })
  .transform((environment) => ({
    ...environment,
    MEDIA_STORAGE:
      environment.MEDIA_STORAGE ??
      (environment.NODE_ENV === 'production' ? 's3' : 'local'),
  }))
  .superRefine((environment, context) => {
    try {
      assertSafeSeoAiBaseUrl(environment.SEO_AI_BASE_URL);
    } catch (error) {
      context.addIssue({
        code: 'custom',
        path: ['SEO_AI_BASE_URL'],
        message:
          error instanceof Error
            ? error.message
            : 'SEO_AI_BASE_URL is not a safe HTTPS allowlisted URL',
      });
    }

    if (environment.PAYMENT_PROVIDER === 'epoint') {
      if (environment.EPOINT_PUBLIC_KEY === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['EPOINT_PUBLIC_KEY'],
          message: 'EPOINT_PUBLIC_KEY is required when PAYMENT_PROVIDER=epoint',
        });
      }

      if (environment.EPOINT_PRIVATE_KEY === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['EPOINT_PRIVATE_KEY'],
          message:
            'EPOINT_PRIVATE_KEY is required when PAYMENT_PROVIDER=epoint',
        });
      }
    }

    if (environment.EPOINT_INSTALLMENT_MONTHS !== undefined) {
      const months = environment.EPOINT_INSTALLMENT_MONTHS.split(',')
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value));
      const uniqueMonths = [...new Set(months)].sort(
        (left, right) => left - right,
      );
      const original = environment.EPOINT_INSTALLMENT_MONTHS.split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
      const isValid =
        original.length > 0 &&
        original.length === months.length &&
        uniqueMonths.length === months.length &&
        uniqueMonths.every(
          (value) => Number.isInteger(value) && value >= 2 && value <= 24,
        );
      if (!isValid) {
        context.addIssue({
          code: 'custom',
          path: ['EPOINT_INSTALLMENT_MONTHS'],
          message:
            'EPOINT_INSTALLMENT_MONTHS must be a comma-separated list of unique integers between 2 and 24',
        });
      }
    }

    if (
      environment.EPOINT_INSTALLMENT_MINIMUM !== undefined &&
      Number(environment.EPOINT_INSTALLMENT_MINIMUM) <= 0
    ) {
      context.addIssue({
        code: 'custom',
        path: ['EPOINT_INSTALLMENT_MINIMUM'],
        message: 'EPOINT_INSTALLMENT_MINIMUM must be greater than zero',
      });
    }

    if (environment.NODE_ENV !== 'production') {
      return;
    }

    if (environment.PAYMENT_PROVIDER.toLowerCase() === 'mock') {
      context.addIssue({
        code: 'custom',
        path: ['PAYMENT_PROVIDER'],
        message: 'PAYMENT_PROVIDER=mock is forbidden in production',
      });
    }

    if (environment.FISCAL_RECEIPT_PROVIDER === 'log') {
      context.addIssue({
        code: 'custom',
        path: ['FISCAL_RECEIPT_PROVIDER'],
        message:
          'FISCAL_RECEIPT_PROVIDER=log is forbidden in production (rehearsal-only)',
      });
    }

    const appSecret = environment.APP_SECRET.trim().toLowerCase();
    if (
      FORBIDDEN_PRODUCTION_APP_SECRETS.has(environment.APP_SECRET) ||
      FORBIDDEN_PRODUCTION_APP_SECRETS.has(appSecret) ||
      appSecret.includes('change_me') ||
      appSecret.includes('change-me') ||
      appSecret.includes('example')
    ) {
      context.addIssue({
        code: 'custom',
        path: ['APP_SECRET'],
        message:
          'A production APP_SECRET must be explicitly configured (not a default/example value)',
      });
    }

    if (
      environment.EMAIL_FROM.includes('itmarket.local') ||
      environment.EMAIL_FROM.includes('no-reply@itmarket.local')
    ) {
      context.addIssue({
        code: 'custom',
        path: ['EMAIL_FROM'],
        message: 'A production EMAIL_FROM must be explicitly configured',
      });
    }

    if (
      environment.SMTP_HOST === 'localhost' ||
      environment.SMTP_HOST === '127.0.0.1'
    ) {
      context.addIssue({
        code: 'custom',
        path: ['SMTP_HOST'],
        message: 'A production SMTP_HOST must not point at localhost',
      });
    }

    for (const field of ['STOREFRONT_ORIGIN', 'BACKOFFICE_ORIGIN'] as const) {
      const origin = new URL(environment[field]);
      if (
        origin.protocol !== 'https:' ||
        origin.origin !== environment[field]
      ) {
        context.addIssue({
          code: 'custom',
          path: [field],
          message: `${field} must be an HTTPS origin without path, query, or credentials`,
        });
      }
    }

    if (environment.MEDIA_STORAGE === 'local') {
      context.addIssue({
        code: 'custom',
        path: ['MEDIA_STORAGE'],
        message: 'MEDIA_STORAGE=local is forbidden in production',
      });
    }

    for (const field of [
      'S3_ENDPOINT',
      'S3_REGION',
      'S3_ACCESS_KEY',
      'S3_SECRET_KEY',
      'S3_BUCKET',
    ] as const) {
      if (environment[field].trim().length === 0) {
        context.addIssue({
          code: 'custom',
          path: [field],
          message: `${field} is required in production`,
        });
      }
    }

    try {
      const s3Endpoint = new URL(environment.S3_ENDPOINT);
      if (
        s3Endpoint.hostname === 'localhost' ||
        s3Endpoint.hostname === '127.0.0.1'
      ) {
        context.addIssue({
          code: 'custom',
          path: ['S3_ENDPOINT'],
          message: 'A production S3_ENDPOINT must not point at localhost',
        });
      }
    } catch {
      context.addIssue({
        code: 'custom',
        path: ['S3_ENDPOINT'],
        message: 'S3_ENDPOINT must be a valid URL',
      });
    }

    if (environment.S3_ACCESS_KEY === 'itmarket_local') {
      context.addIssue({
        code: 'custom',
        path: ['S3_ACCESS_KEY'],
        message: 'A production S3_ACCESS_KEY must be explicitly configured',
      });
    }

    if (
      environment.S3_SECRET_KEY ===
      'local_itmarket_minio_only_ChangeOutsideLocal'
    ) {
      context.addIssue({
        code: 'custom',
        path: ['S3_SECRET_KEY'],
        message: 'A production S3_SECRET_KEY must be explicitly configured',
      });
    }

    try {
      const redisUrl = new URL(environment.REDIS_URL);
      if (redisUrl.password === '') {
        context.addIssue({
          code: 'custom',
          path: ['REDIS_URL'],
          message:
            'A production REDIS_URL must include a password (requirepass)',
        });
      }
    } catch {
      context.addIssue({
        code: 'custom',
        path: ['REDIS_URL'],
        message: 'REDIS_URL must be a valid URL',
      });
    }

    if (environment.STAFF_MFA_REQUIRED !== true) {
      context.addIssue({
        code: 'custom',
        path: ['STAFF_MFA_REQUIRED'],
        message: 'STAFF_MFA_REQUIRED must be true in production',
      });
    }

    if (environment.SMTP_SECURE !== true) {
      context.addIssue({
        code: 'custom',
        path: ['SMTP_SECURE'],
        message: 'SMTP_SECURE must be true in production',
      });
    }

    if (
      environment.SMTP_USER === undefined ||
      environment.SMTP_USER.trim() === ''
    ) {
      context.addIssue({
        code: 'custom',
        path: ['SMTP_USER'],
        message: 'SMTP_USER is required in production',
      });
    }

    if (
      environment.SMTP_PASS === undefined ||
      environment.SMTP_PASS.length === 0
    ) {
      context.addIssue({
        code: 'custom',
        path: ['SMTP_PASS'],
        message: 'SMTP_PASS is required in production',
      });
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

function isExplicitTrustProxyHops(value: unknown): boolean {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return true;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return true;
  }
  return false;
}

export function validateEnvironment(
  input: Record<string, unknown>,
): Environment {
  if (input.NODE_ENV === 'production') {
    const required = [
      'DATABASE_URL',
      'REDIS_URL',
      'APP_SECRET',
      'PAYMENT_PROVIDER',
      'EPOINT_PUBLIC_KEY',
      'EPOINT_PRIVATE_KEY',
      'STOREFRONT_ORIGIN',
      'BACKOFFICE_ORIGIN',
      'METRICS_TOKEN',
      'SMTP_HOST',
      'EMAIL_FROM',
      'S3_ENDPOINT',
      'S3_REGION',
      'S3_ACCESS_KEY',
      'S3_SECRET_KEY',
      'S3_BUCKET',
    ].filter(
      (name) =>
        typeof input[name] !== 'string' || input[name].trim().length === 0,
    );
    // Fail-closed: ops must set hop count for the real edge topology (0 = direct).
    if (!isExplicitTrustProxyHops(input.TRUST_PROXY_HOPS)) {
      required.push('TRUST_PROXY_HOPS');
    }
    if (required.length > 0) {
      throw new Error(
        `Invalid environment configuration: production requires ${required.join(', ')}`,
      );
    }
  }

  const result = environmentSchema.safeParse(input);

  if (!result.success) {
    const reasons = result.error.issues
      .map(
        (issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`,
      )
      .join('; ');
    throw new Error(`Invalid environment configuration: ${reasons}`);
  }

  return result.data;
}
