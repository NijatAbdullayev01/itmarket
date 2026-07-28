import { createHash, randomUUID } from 'node:crypto';

import {
  findPaymentAttemptByToken,
  hashPaymentAttemptToken,
  isPaymentAttemptTokenHash,
  rotatePaymentAttemptCapabilityToken,
} from './payment-attempt-token';

describe('payment-attempt-token', () => {
  it('hashes tokens as sha256 hex', () => {
    const token = randomUUID();
    expect(hashPaymentAttemptToken(token)).toBe(
      createHash('sha256').update(token, 'utf8').digest('hex'),
    );
    expect(isPaymentAttemptTokenHash(hashPaymentAttemptToken(token))).toBe(
      true,
    );
  });

  it('resolves hash-at-rest rows by hashing the presented opaque token', async () => {
    const opaque = randomUUID();
    const storedHash = hashPaymentAttemptToken(opaque);
    const row = { id: 'attempt-1', providerCheckoutToken: storedHash };
    const findUnique = jest.fn().mockResolvedValueOnce(row);
    const prisma = {
      paymentAttempt: { findUnique, update: jest.fn() },
    };

    const found = await findPaymentAttemptByToken(prisma as never, opaque);
    expect(found).toBe(row);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { providerCheckoutToken: storedHash },
      }),
    );
  });

  it('rejects presenting the stored hash as a bearer token', async () => {
    const opaque = randomUUID();
    const storedHash = hashPaymentAttemptToken(opaque);
    const prisma = {
      paymentAttempt: { findUnique: jest.fn(), update: jest.fn() },
    };

    const found = await findPaymentAttemptByToken(prisma as never, storedHash);
    expect(found).toBeNull();
    expect(prisma.paymentAttempt.findUnique).not.toHaveBeenCalled();
  });

  it('does not accept legacy plaintext dual-read rows', async () => {
    const opaque = randomUUID();
    const findUnique = jest.fn().mockResolvedValueOnce(null);
    const prisma = {
      paymentAttempt: { findUnique, update: jest.fn() },
    };

    const found = await findPaymentAttemptByToken(prisma as never, opaque);
    expect(found).toBeNull();
    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.paymentAttempt.update).not.toHaveBeenCalled();
  });

  it('rotates capability tokens to a fresh opaque value hashed at rest', async () => {
    const update = jest.fn().mockResolvedValue({});
    const tx = { paymentAttempt: { update } };

    const next = await rotatePaymentAttemptCapabilityToken(
      tx as never,
      'attempt-1',
    );
    expect(next).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(isPaymentAttemptTokenHash(next)).toBe(false);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'attempt-1' },
      data: { providerCheckoutToken: hashPaymentAttemptToken(next) },
    });
  });
});
