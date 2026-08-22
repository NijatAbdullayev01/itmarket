import { NextResponse } from "next/server";

import { assertSameOriginMutation } from "@/lib/assert-same-origin-mutation";
import { resolveApiBaseUrl } from "@/lib/resolve-api-base-url";
import { resolveStorefrontOrigin } from "@/lib/site-origin";
import { readSupportChatCookieSession } from "@/lib/support-chat-cookie";

const SUPPORT_GUEST_TOKEN_HEADER = "x-support-guest-token";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!assertSameOriginMutation(request)) {
    return NextResponse.json(
      { message: "Request origin is not allowed" },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  const session = await readSupportChatCookieSession();
  if (session === null || session.threadId !== id) {
    return NextResponse.json(
      { message: "Söhbət sessiyası tapılmadı" },
      { status: 401 },
    );
  }

  const body = await request.text();
  const storefrontOrigin = resolveStorefrontOrigin();
  const upstream = await fetch(
    `${resolveApiBaseUrl()}/storefront/support-messages/${id}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: storefrontOrigin,
        "sec-fetch-site": "same-origin",
        [SUPPORT_GUEST_TOKEN_HEADER]: session.guestToken,
      },
      body,
      cache: "no-store",
    },
  );
  const responseBody = await upstream.text();
  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}
