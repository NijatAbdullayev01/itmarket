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
 * Does not mutate cookies during RSC render (Next.js restriction).
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
