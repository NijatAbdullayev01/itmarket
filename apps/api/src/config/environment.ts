import { z } from 'zod';

const paymentProviderSchema = z.enum(['mock', 'epoint']);
const fiscalReceiptProviderSchema = z.enum(['none']).default('none');
const decimalAmountSchema = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,2})?$/, 'must be a positive decimal amount');

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
    PAYMENT_PROVIDER: paymentProviderSchema.default('mock'),
    FISCAL_RECEIPT_PROVIDER: fiscalReceiptProviderSchema,
    EPOINT_PUBLIC_KEY: z.string().trim().min(1).optional(),
    EPOINT_PRIVATE_KEY: z.string().trim().min(1).optional(),
    EPOINT_INSTALLMENT_MONTHS: z.string().trim().min(1).optional(),
    EPOINT_INSTALLMENT_MINIMUM: decimalAmountSchema.optional(),
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
  })
  .superRefine((environment, context) => {
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

    if (environment.APP_SECRET === 'development-only-secret-change-me') {
      context.addIssue({
        code: 'custom',
        path: ['APP_SECRET'],
        message: 'A production APP_SECRET must be explicitly configured',
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
  });

export type Environment = z.infer<typeof environmentSchema>;

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
    ].filter(
      (name) =>
        typeof input[name] !== 'string' || input[name].trim().length === 0,
    );
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
