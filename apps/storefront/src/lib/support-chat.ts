import type {
  SupportChatMessageContract,
  SupportChatRealtimeEvent,
} from "@itmarket/contracts";

import { BROWSER_API_BASE } from "./resolve-api-base-url";

const STORAGE_KEY = "itmarket_support_chat_session";
const SUPPORT_GUEST_TOKEN_HEADER = "x-support-guest-token";

export type SupportChatSession = {
  threadId: string;
  guestToken: string;
};

export type SupportChatThread = {
  id: string;
  status: "PENDING" | "OPEN" | "CLOSED";
  messages: SupportChatMessageContract[];
};

export type StartSupportChatInput = {
  name: string;
  phone: string;
  email?: string;
  body: string;
  pagePath?: string;
};

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as {
      message?: string | string[];
    };
    if (typeof payload.message === "string" && payload.message.trim() !== "") {
      return payload.message;
    }
    if (Array.isArray(payload.message) && payload.message[0]) {
      return payload.message[0];
    }
  } catch {
    // ignore
  }
  return "Mesaj göndərilə bilmədi";
}

export function loadSupportChatSession(): SupportChatSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    const parsed = JSON.parse(raw) as SupportChatSession;
    if (
      typeof parsed.threadId === "string" &&
      typeof parsed.guestToken === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSupportChatSession(session: SupportChatSession): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSupportChatSession(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

export async function startSupportChat(
  input: StartSupportChatInput,
): Promise<SupportChatThread & { guestToken: string }> {
  const response = await fetch(`${BROWSER_API_BASE}/storefront/support-messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const data = (await response.json()) as {
    id: string;
    status: SupportChatThread["status"];
    guestToken: string;
    messages: SupportChatMessageContract[];
  };
  return {
    id: data.id,
    status: data.status,
    guestToken: data.guestToken,
    messages: data.messages,
  };
}

export async function loadSupportChatThread(
  session: SupportChatSession,
): Promise<SupportChatThread> {
  const response = await fetch(
    `${BROWSER_API_BASE}/storefront/support-messages/${session.threadId}`,
    {
      headers: {
        [SUPPORT_GUEST_TOKEN_HEADER]: session.guestToken,
      },
    },
  );
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as SupportChatThread;
}

export async function sendSupportChatMessage(
  session: SupportChatSession,
  body: string,
): Promise<SupportChatMessageContract> {
  const response = await fetch(
    `${BROWSER_API_BASE}/storefront/support-messages/${session.threadId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [SUPPORT_GUEST_TOKEN_HEADER]: session.guestToken,
      },
      body: JSON.stringify({ body }),
    },
  );
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as SupportChatMessageContract;
}

export function openSupportChatEventSource(
  session: SupportChatSession,
  onEvent: (event: SupportChatRealtimeEvent) => void,
): () => void {
  // EventSource cannot set custom headers; guestToken remains query-only here.
  const url = new URL(
    `${BROWSER_API_BASE}/storefront/support-messages/${session.threadId}/events`,
    window.location.origin,
  );
  url.searchParams.set("guestToken", session.guestToken);

  let closed = false;
  let source: EventSource | null = null;
  let pollTimer: number | null = null;
  let seenIds = new Set<string>();

  const handlePayload = (payload: SupportChatRealtimeEvent) => {
    if (payload.type === "message") {
      if (seenIds.has(payload.message.id)) {
        return;
      }
      seenIds.add(payload.message.id);
      onEvent(payload);
      return;
    }
    if (payload.type === "status") {
      onEvent(payload);
    }
  };

  const startPollFallback = () => {
    if (pollTimer !== null || closed) {
      return;
    }
    pollTimer = window.setInterval(() => {
      void loadSupportChatThread(session)
        .then((thread) => {
          for (const message of thread.messages) {
            handlePayload({
              type: "message",
              threadId: thread.id,
              message,
            });
          }
          handlePayload({
            type: "status",
            threadId: thread.id,
            status: thread.status,
          });
        })
        .catch(() => undefined);
    }, 3000);
  };

  try {
    source = new EventSource(url.toString());
    const onFrame = (event: MessageEvent<string>) => {
      try {
        handlePayload(JSON.parse(event.data) as SupportChatRealtimeEvent);
      } catch {
        // ignore
      }
    };
    source.addEventListener("message", onFrame as EventListener);
    source.addEventListener("status", onFrame as EventListener);
    source.onerror = () => {
      source?.close();
      source = null;
      startPollFallback();
    };
  } catch {
    startPollFallback();
  }

  return () => {
    closed = true;
    source?.close();
    if (pollTimer !== null) {
      window.clearInterval(pollTimer);
    }
    seenIds = new Set();
  };
}
