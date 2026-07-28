import { createHash, randomBytes } from 'node:crypto';
import type { PrismaService } from '../infrastructure/prisma/prisma.service';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Issues a fresh password-reset capability for outbox retry.
 * Never persists the plaintext token — caller holds it only in memory for the email.
 */
export async function issuePasswordResetPathForOutbox(
  prisma: PrismaService,
  customerId: string,
): Promise<string | null> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, active: true },
  });
  if (customer === null || !customer.active) {
    return null;
  }

  const token = randomBytes(32).toString('base64url');
  await prisma.$transaction(async (tx) => {
    await tx.customerPasswordReset.updateMany({
      where: { customerId: customer.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.customerPasswordReset.create({
      data: {
        customerId: customer.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });
  });

  return `/account/reset-password?token=${encodeURIComponent(token)}`;
}
