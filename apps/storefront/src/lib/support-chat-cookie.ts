import { cookies } from "next/headers";

const SUPPORT_SESSION_COOKIE = "itmarket_support_chat";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SupportChatCookieSession = {
  threadId: string;
  guestToken: string;
};

function isSupportChatCookieSession(
  value: unknown,
): value is SupportChatCookieSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const session = value as Record<string, unknown>;
  return (
    typeof session.threadId === "string" &&
    session.threadId.trim() !== "" &&
    typeof session.guestToken === "string" &&
    session.guestToken.trim().length >= 16
  );
}

export async function readSupportChatCookieSession(): Promise<SupportChatCookieSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SUPPORT_SESSION_COOKIE)?.value;
  if (raw === undefined) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isSupportChatCookieSession(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeSupportChatCookieSession(
  session: SupportChatCookieSession,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SUPPORT_SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearSupportChatCookieSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SUPPORT_SESSION_COOKIE);
}
