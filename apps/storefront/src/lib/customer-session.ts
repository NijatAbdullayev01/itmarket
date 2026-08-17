import { cookies } from "next/headers";
import { cache } from "react";

import { fetchCustomerProfile } from "@/lib/customer-account";

const SESSION_COOKIE = "itmarket_customer_session";
const PROFILE_COOKIE = "itmarket_customer_profile";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type CustomerProfile = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
};

/**
 * Validates the session token with the API once per request (React cache).
 * Use on account/checkout. Catalog chrome should use getCustomerChromeProfile
 * so every page is not blocked on `/customer/me`.
 */
export const getCustomerProfile = cache(async (): Promise<CustomerProfile | null> => {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (session === undefined) return null;

  const validated = await fetchCustomerProfile(session);
  if (!validated.ok) {
    return null;
  }

  return {
    id: validated.data.id,
    email: validated.data.email,
    firstName: validated.data.firstName,
    lastName: validated.data.lastName,
    phone: validated.data.phone,
  };
});

function parseProfileCookie(raw: string | undefined): CustomerProfile | null {
  if (raw === undefined || raw.trim() === "") {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      id?: unknown;
      email?: unknown;
      firstName?: unknown;
      lastName?: unknown;
      phone?: unknown;
    };
    if (typeof parsed.id !== "string" || typeof parsed.email !== "string") {
      return null;
    }

    return {
      id: parsed.id,
      email: parsed.email,
      firstName: typeof parsed.firstName === "string" ? parsed.firstName : null,
      lastName: typeof parsed.lastName === "string" ? parsed.lastName : null,
      phone: typeof parsed.phone === "string" ? parsed.phone : null,
    };
  } catch {
    return null;
  }
}

/**
 * Header/support chrome profile from cookies only — no API round-trip.
 * Requires a session cookie so a leftover profile cookie cannot impersonate.
 */
export const getCustomerChromeProfile = cache(
  async (): Promise<CustomerProfile | null> => {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE)?.value;
    if (session === undefined) {
      return null;
    }
    const fromCookie = parseProfileCookie(cookieStore.get(PROFILE_COOKIE)?.value);
    if (fromCookie !== null) {
      return fromCookie;
    }
    return getCustomerProfile();
  },
);

export async function setCustomerSession(input: {
  sessionToken: string;
  customer: CustomerProfile;
}) {
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";

  cookieStore.set(SESSION_COOKIE, input.sessionToken, {
    httpOnly: true,
    sameSite: "strict",
    secure,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  cookieStore.set(PROFILE_COOKIE, JSON.stringify(input.customer), {
    httpOnly: true,
    sameSite: "strict",
    secure,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearCustomerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(PROFILE_COOKIE);
}

export async function getCustomerSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}
