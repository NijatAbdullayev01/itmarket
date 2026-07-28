import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';

import { CartStatus } from '../generated/prisma/client';
import type { PrismaService } from '../infrastructure/prisma/prisma.service';

/** Capability secret for guest cart read/mutate/checkout (not a session cookie). */
export const CART_GUEST_TOKEN_HEADER = 'x-cart-guest-token';

export function hashCartGuestToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function cartGuestTokenHashesEqual(
  leftHex: string,
  rightHex: string,
): boolean {
  const left = Buffer.from(leftHex, 'utf8');
  const right = Buffer.from(rightHex, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}

type CartGuestTokenRow = {
  status: CartStatus;
  guestToken: string | null;
  guestTokenHash: string | null;
};

/**
 * Verifies guest cart capability against hash-at-rest only.
 * Legacy plaintext `guestToken` is scrubbed when a matching hash exists;
 * plaintext-only rows are rejected (backfill migrations must have run).
 */
export async function assertCartGuestAccess(
  prisma: PrismaService,
  cartId: string,
  guestToken: string | undefined,
): Promise<void> {
  if (guestToken === undefined || guestToken.trim() === '') {
    throw new BadRequestException('Cart guest token is required');
  }
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    select: { status: true, guestToken: true, guestTokenHash: true },
  });
  if (cart === null) {
    throw new ForbiddenException('Cart access denied');
  }
  await verifyAndMaybeMigrateCartGuestToken(prisma, cartId, cart, guestToken);
}

export async function verifyAndMaybeMigrateCartGuestToken(
  prisma: PrismaService,
  cartId: string,
  cart: CartGuestTokenRow,
  guestToken: string,
): Promise<void> {
  if (cart.status !== CartStatus.ACTIVE) {
    throw new ConflictException('Cart is not active');
  }

  const tokenHash = hashCartGuestToken(guestToken);

  if (cart.guestTokenHash === null) {
    // Dual-read window closed: plaintext-only carts cannot authenticate.
    throw new ForbiddenException('Cart access denied');
  }

  if (!cartGuestTokenHashesEqual(cart.guestTokenHash, tokenHash)) {
    throw new ForbiddenException('Cart access denied');
  }

  if (cart.guestToken !== null) {
    await prisma.cart.update({
      where: { id: cartId },
      data: { guestToken: null },
    });
  }
}
