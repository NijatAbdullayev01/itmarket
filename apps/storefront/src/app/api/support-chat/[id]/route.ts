import { NextResponse } from "next/server";

import { resolveApiBaseUrl } from "@/lib/resolve-api-base-url";
import { readSupportChatCookieSession } from "@/lib/support-chat-cookie";

const SUPPORT_GUEST_TOKEN_HEADER = "x-support-guest-token";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await readSupportChatCookieSession();
  if (session === null || session.threadId !== id) {
    return NextResponse.json(
      { message: "Söhbət sessiyası tapılmadı" },
      { status: 401 },
    );
  }

  const upstream = await fetch(
    `${resolveApiBaseUrl()}/storefront/support-messages/${id}`,
    {
      headers: {
        [SUPPORT_GUEST_TOKEN_HEADER]: session.guestToken,
      },
      cache: "no-store",
    },
  );
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}
