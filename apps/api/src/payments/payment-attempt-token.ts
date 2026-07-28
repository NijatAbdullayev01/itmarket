import { createHash, randomUUID } from 'node:crypto';

import type { Prisma } from '../generated/prisma/client';
import type { PrismaService } from '../infrastructure/prisma/prisma.service';

/** SHA-256 hex digest length — also the at-rest storage format. */
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/i;

export function hashPaymentAttemptToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function isPaymentAttemptTokenHash(value: string): boolean {
  return SHA256_HEX_PATTERN.test(value);
}

export function issuePaymentAttemptToken(): string {
  return randomUUID();
}

/**
 * Resolves a payment attempt by capability token (hash-at-rest only).
 *
 * Stored hashes must never be accepted as bearer tokens: presenting the
 * DB value (64-char hex) fails because hash(hash) will not match.
 *
 * Callers pass Prisma `include` and narrow the result at the call site.
 */
export async function findPaymentAttemptByToken(
  prisma: PrismaService,
  attemptToken: string,
  args?: {
    include?: Prisma.PaymentAttemptInclude;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- include shape varies by caller
): Promise<any> {
  if (attemptToken.trim() === '') {
    return null;
  }

  // Reject presenting a stored digest as bearer (defense in depth).
  if (isPaymentAttemptTokenHash(attemptToken)) {
    return null;
  }

  const tokenHash = hashPaymentAttemptToken(attemptToken);
  const include = args?.include;

  return prisma.paymentAttempt.findUnique({
    where: { providerCheckoutToken: tokenHash },
    ...(include === undefined ? {} : { include }),
  });
}

/**
 * Issues a fresh opaque capability token and stores only its hash.
 * Used on idempotent checkout retries so handoff URLs never reuse the
 * at-rest hash as a bearer.
 */
export async function rotatePaymentAttemptCapabilityToken(
  tx: Prisma.TransactionClient,
  attemptId: string,
): Promise<string> {
  const nextToken = issuePaymentAttemptToken();
  await tx.paymentAttempt.update({
    where: { id: attemptId },
    data: { providerCheckoutToken: hashPaymentAttemptToken(nextToken) },
  });
  return nextToken;
}
