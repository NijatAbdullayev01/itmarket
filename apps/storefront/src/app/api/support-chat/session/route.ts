import { NextResponse } from "next/server";

import { assertSameOriginMutation } from "@/lib/assert-same-origin-mutation";
import { resolveApiBaseUrl } from "@/lib/resolve-api-base-url";
import {
  clearSupportChatCookieSession,
  readSupportChatCookieSession,
  writeSupportChatCookieSession,
} from "@/lib/support-chat-cookie";

const SUPPORT_GUEST_TOKEN_HEADER = "x-support-guest-token";

async function verifySupportGuestAccess(
  threadId: string,
  guestToken: string,
): Promise<boolean> {
  const upstream = await fetch(
    `${resolveApiBaseUrl()}/storefront/support-messages/${encodeURIComponent(threadId)}`,
    {
      headers: {
        [SUPPORT_GUEST_TOKEN_HEADER]: guestToken,
      },
      cache: "no-store",
    },
  );
  return upstream.ok;
}

export async function GET() {
  const session = await readSupportChatCookieSession();
  if (session === null) {
    return NextResponse.json({ threadId: null });
  }
  return NextResponse.json({
    threadId: session.threadId,
    guestToken: "httpOnly",
  });
}

export async function POST(request: Request) {
  if (!assertSameOriginMutation(request)) {
    return NextResponse.json(
      { message: "Request origin is not allowed" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Yanlış JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ message: "Yanlış gövdə" }, { status: 400 });
  }
  const record = body as Record<string, unknown>;
  if (
    typeof record.threadId !== "string" ||
    typeof record.guestToken !== "string" ||
    record.guestToken.trim().length < 16
  ) {
    return NextResponse.json({ message: "Sessiya düzgün deyil" }, { status: 400 });
  }

  const allowed = await verifySupportGuestAccess(
    record.threadId,
    record.guestToken,
  );
  if (!allowed) {
    return NextResponse.json(
      { message: "Söhbət sessiyası təsdiqlənmədi" },
      { status: 403 },
    );
  }

  await writeSupportChatCookieSession({
    threadId: record.threadId,
    guestToken: record.guestToken,
  });
  return NextResponse.json({
    threadId: record.threadId,
    guestToken: "httpOnly",
  });
}

export async function DELETE(request: Request) {
  if (!assertSameOriginMutation(request)) {
    return NextResponse.json(
      { message: "Request origin is not allowed" },
      { status: 403 },
    );
  }
  await clearSupportChatCookieSession();
  return NextResponse.json({ ok: true });
}
