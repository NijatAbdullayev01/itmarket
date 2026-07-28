import type {
  SupportChatMessageContract,
  SupportChatRealtimeEvent,
} from "@itmarket/contracts";

import { BROWSER_API_BASE } from "./resolve-api-base-url";

const THREAD_STORAGE_KEY = "itmarket_support_chat_thread";
/** Opaque placeholder — real token lives in httpOnly cookie. */
const HTTPONLY_TOKEN_PLACEHOLDER = "httpOnly";

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
  customerId?: string;
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

function readThreadId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(THREAD_STORAGE_KEY);
    if (raw === null || raw.trim() === "") {
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

function writeThreadId(threadId: string): void {
  window.sessionStorage.setItem(THREAD_STORAGE_KEY, threadId);
}

function clearThreadId(): void {
  window.sessionStorage.removeItem(THREAD_STORAGE_KEY);
}

/** Migrate legacy localStorage sessions into httpOnly cookie once. */
async function migrateLegacyLocalStorageSession(): Promise<SupportChatSession | null> {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const legacy = window.localStorage.getItem("itmarket_support_chat_session");
    if (legacy === null) {
      return null;
    }
    const parsed = JSON.parse(legacy) as SupportChatSession;
    if (
      typeof parsed.threadId !== "string" ||
      typeof parsed.guestToken !== "string" ||
      parsed.guestToken.length < 16
    ) {
      window.localStorage.removeItem("itmarket_support_chat_session");
      return null;
    }
    await fetch("/api/support-chat/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });
    window.localStorage.removeItem("itmarket_support_chat_session");
    writeThreadId(parsed.threadId);
    return {
      threadId: parsed.threadId,
      guestToken: HTTPONLY_TOKEN_PLACEHOLDER,
    };
  } catch {
    return null;
  }
}

export function loadSupportChatSession(): SupportChatSession | null {
  const threadId = readThreadId();
  if (threadId === null) {
    return null;
  }
  return { threadId, guestToken: HTTPONLY_TOKEN_PLACEHOLDER };
}

export function saveSupportChatSession(session: SupportChatSession): void {
  writeThreadId(session.threadId);
  if (
    session.guestToken !== HTTPONLY_TOKEN_PLACEHOLDER &&
    session.guestToken.trim().length >= 16
  ) {
    void fetch("/api/support-chat/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadId: session.threadId,
        guestToken: session.guestToken,
      }),
    });
  }
}

export function clearSupportChatSession(): void {
  clearThreadId();
  void fetch("/api/support-chat/session", { method: "DELETE" });
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
  await fetch("/api/support-chat/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      threadId: data.id,
      guestToken: data.guestToken,
    }),
  });
  writeThreadId(data.id);
  return {
    id: data.id,
    status: data.status,
    guestToken: HTTPONLY_TOKEN_PLACEHOLDER,
    messages: data.messages,
  };
}

export async function loadSupportChatThread(
  session: SupportChatSession,
): Promise<SupportChatThread> {
  await migrateLegacyLocalStorageSession();
  const response = await fetch(`/api/support-chat/${session.threadId}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as SupportChatThread;
}

export async function sendSupportChatMessage(
  session: SupportChatSession,
  body: string,
): Promise<SupportChatMessageContract> {
  const response = await fetch(`/api/support-chat/${session.threadId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as SupportChatMessageContract;
}

export function openSupportChatEventSource(
  session: SupportChatSession,
  onEvent: (event: SupportChatRealtimeEvent) => void,
): () => void {
  // Same-origin BFF SSE — guestToken stays in httpOnly cookie (never in URL).
  const url = `/api/support-chat/${session.threadId}/events`;

  let closed = false;
  let abort: AbortController | null = null;
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

  const parseSseChunk = (chunk: string) => {
    if (chunk.trim() === "" || chunk.startsWith(":")) {
      return;
    }
    let eventName = "message";
    let data = "";
    for (const line of chunk.split("\n")) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        data += line.slice(5).trim();
      }
    }
    if (data === "" || eventName === "ready") {
      return;
    }
    try {
      handlePayload(JSON.parse(data) as SupportChatRealtimeEvent);
    } catch {
      // ignore malformed frames
    }
  };

  abort = new AbortController();
  void fetch(url, {
    headers: { Accept: "text/event-stream" },
    signal: abort.signal,
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok || response.body === null) {
        startPollFallback();
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (!closed) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          parseSseChunk(part);
        }
      }
      if (!closed) {
        startPollFallback();
      }
    })
    .catch(() => {
      if (!closed) {
        startPollFallback();
      }
    });

  return () => {
    closed = true;
    abort?.abort();
    if (pollTimer !== null) {
      window.clearInterval(pollTimer);
    }
    seenIds = new Set();
  };
}

/** Hydrate sessionStorage from httpOnly cookie after refresh. */
export async function hydrateSupportChatSession(): Promise<SupportChatSession | null> {
  const legacy = await migrateLegacyLocalStorageSession();
  if (legacy !== null) {
    return legacy;
  }
  const response = await fetch("/api/support-chat/session", { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as {
    threadId: string | null;
  };
  if (typeof data.threadId !== "string" || data.threadId.trim() === "") {
    return null;
  }
  writeThreadId(data.threadId);
  return { threadId: data.threadId, guestToken: HTTPONLY_TOKEN_PLACEHOLDER };
}
