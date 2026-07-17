import { cookies } from "next/headers";

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

function isCustomerProfile(value: unknown): value is CustomerProfile {
  if (typeof value !== "object" || value === null) return false;
  const profile = value as Record<string, unknown>;
  return (
    typeof profile.id === "string" &&
    typeof profile.email === "string" &&
    profile.email.trim() !== ""
  );
}

export async function getCustomerProfile(): Promise<CustomerProfile | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (session === undefined) return null;

  const profileRaw = cookieStore.get(PROFILE_COOKIE)?.value;
  if (profileRaw === undefined) return null;

  try {
    const profile = JSON.parse(profileRaw) as unknown;
    if (!isCustomerProfile(profile)) {
      return null;
    }
    return profile;
  } catch {
    return null;
  }
}

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
