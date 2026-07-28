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
    return new Response(JSON.stringify({ message: "Söhbət sessiyası tapılmadı" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const upstream = await fetch(
    `${resolveApiBaseUrl()}/storefront/support-messages/${id}/events`,
    {
      headers: {
        Accept: "text/event-stream",
        [SUPPORT_GUEST_TOKEN_HEADER]: session.guestToken,
      },
      cache: "no-store",
    },
  );

  if (!upstream.ok || upstream.body === null) {
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
