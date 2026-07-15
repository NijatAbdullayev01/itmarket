import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

const CART_ID_COOKIE = "itmarket_guest_cart_id";
const GUEST_TOKEN_COOKIE = "itmarket_guest_token";
const CHECKOUT_IDEMPOTENCY_COOKIE_PREFIX = "itmarket_checkout_idempotency_";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const CHECKOUT_IDEMPOTENCY_MAX_AGE_SECONDS = 60 * 60 * 2;

export function checkoutIdempotencyCookieName(cartId: string) {
  return `${CHECKOUT_IDEMPOTENCY_COOKIE_PREFIX}${cartId}`;
}

export type GuestCartSession = {
  cartId?: string;
  guestToken?: string;
};

export async function getGuestCartSession(): Promise<GuestCartSession> {
  const cookieStore = await cookies();
  return {
    cartId: cookieStore.get(CART_ID_COOKIE)?.value,
    guestToken: cookieStore.get(GUEST_TOKEN_COOKIE)?.value,
  };
}

export async function setGuestCartSession(session: {
  cartId: string;
  guestToken?: string | null;
}) {
  const cookieStore = await cookies();
  cookieStore.set(CART_ID_COOKIE, session.cartId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  if (session.guestToken) {
    cookieStore.set(GUEST_TOKEN_COOKIE, session.guestToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });
  }
}

export async function clearGuestCartSession() {
  const cookieStore = await cookies();
  cookieStore.delete(CART_ID_COOKIE);
  cookieStore.delete(GUEST_TOKEN_COOKIE);
}

export async function clearGuestCartId() {
  const cookieStore = await cookies();
  cookieStore.delete(CART_ID_COOKIE);
}

export async function getCheckoutIdempotencyKey(cartId: string) {
  const cookieStore = await cookies();
  const cookieName = checkoutIdempotencyCookieName(cartId);
  const existing = cookieStore.get(cookieName)?.value;
  if (existing !== undefined && existing.trim().length >= 8) {
    return existing;
  }

  const key = randomUUID();
  cookieStore.set(cookieName, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CHECKOUT_IDEMPOTENCY_MAX_AGE_SECONDS,
  });
  return key;
}

export async function clearCheckoutIdempotencyKey(cartId: string) {
  const cookieStore = await cookies();
  cookieStore.delete(checkoutIdempotencyCookieName(cartId));
}
