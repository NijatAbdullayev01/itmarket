import type { SupportChatRealtimeEvent } from "@itmarket/contracts";

type OpenSupportChatSseOptions = {
  apiBaseUrl: string;
  /** Optional REST poll when EventSource fails (inbox/thread refresh). */
  onPollFallback?: () => void;
  pollIntervalMs?: number;
};

/**
 * Staff support-chat SSE with cookie credentials.
 * On EventSource failure, optionally starts a REST poll fallback.
 */
export function openSupportChatSse(
  path: string,
  handler: (event: SupportChatRealtimeEvent) => void,
  options: OpenSupportChatSseOptions,
): () => void {
  const url = `${options.apiBaseUrl}${path}`;
  const pollIntervalMs = options.pollIntervalMs ?? 3000;
  let closed = false;
  let source: EventSource | null = null;
  let pollTimer: number | null = null;

  const startPollFallback = () => {
    if (pollTimer !== null || closed || options.onPollFallback === undefined) {
      return;
    }
    options.onPollFallback();
    pollTimer = window.setInterval(() => {
      if (!closed) {
        options.onPollFallback?.();
      }
    }, pollIntervalMs);
  };

  try {
    source = new EventSource(url, { withCredentials: true });
    const onFrame = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as SupportChatRealtimeEvent;
        if (
          payload.type === "message" ||
          payload.type === "status" ||
          payload.type === "thread"
        ) {
          handler(payload);
        }
      } catch {
        // ignore malformed frames
      }
    };
    source.addEventListener("message", onFrame as EventListener);
    source.addEventListener("status", onFrame as EventListener);
    source.addEventListener("thread", onFrame as EventListener);
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
  };
}

export function isCustomerSupportArrivalEvent(
  event: SupportChatRealtimeEvent,
): boolean {
  if (event.type === "thread") {
    return true;
  }
  if (event.type === "message") {
    return event.message.senderType === "CUSTOMER";
  }
  return false;
}
