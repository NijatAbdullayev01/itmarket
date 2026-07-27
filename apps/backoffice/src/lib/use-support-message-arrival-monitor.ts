"use client";

import type {
  StaffSupportMessageNavCountsContract,
  SupportChatRealtimeEvent,
} from "@itmarket/contracts";
import { useEffect, useRef } from "react";

import {
  isCustomerSupportArrivalEvent,
  openSupportChatSse,
} from "./support-chat-sse";

export const SUPPORT_MESSAGE_ARRIVAL_POLL_INTERVAL_MS = 15_000;
export const SUPPORT_MESSAGE_ALERT_COOLDOWN_MS = 1_500;

export function detectPendingSupportIncrease(
  previous: StaffSupportMessageNavCountsContract | null,
  next: StaffSupportMessageNavCountsContract,
  baselineEstablished: boolean,
): { arrived: boolean; delta: number } {
  if (!baselineEstablished || previous === null) {
    return { arrived: false, delta: 0 };
  }

  const delta = next.pending - previous.pending;
  if (delta <= 0) {
    return { arrived: false, delta: 0 };
  }

  return { arrived: true, delta };
}

type UseSupportMessageArrivalMonitorOptions = {
  enabled: boolean;
  apiBaseUrl: string;
  pollIntervalMs?: number;
  fetchCounts: () => Promise<StaffSupportMessageNavCountsContract>;
  onCounts: (counts: StaffSupportMessageNavCountsContract) => void;
  onArrival: () => void;
};

export function useSupportMessageArrivalMonitor({
  enabled,
  apiBaseUrl,
  pollIntervalMs = SUPPORT_MESSAGE_ARRIVAL_POLL_INTERVAL_MS,
  fetchCounts,
  onCounts,
  onArrival,
}: UseSupportMessageArrivalMonitorOptions) {
  const previousCountsRef = useRef<StaffSupportMessageNavCountsContract | null>(
    null,
  );
  const baselineEstablishedRef = useRef(false);
  const lastAlertAtRef = useRef(0);
  const onCountsRef = useRef(onCounts);
  const onArrivalRef = useRef(onArrival);
  const fetchCountsRef = useRef(fetchCounts);

  useEffect(() => {
    onCountsRef.current = onCounts;
    onArrivalRef.current = onArrival;
    fetchCountsRef.current = fetchCounts;
  }, [fetchCounts, onArrival, onCounts]);

  useEffect(() => {
    if (!enabled) {
      previousCountsRef.current = null;
      baselineEstablishedRef.current = false;
      lastAlertAtRef.current = 0;
      return;
    }

    let cancelled = false;

    function triggerArrival() {
      const now = Date.now();
      if (now - lastAlertAtRef.current < SUPPORT_MESSAGE_ALERT_COOLDOWN_MS) {
        return;
      }
      lastAlertAtRef.current = now;
      onArrivalRef.current();
    }

    async function pollCounts(options?: { allowArrival: boolean }) {
      try {
        const counts = await fetchCountsRef.current();
        if (cancelled) {
          return;
        }

        const { arrived } = detectPendingSupportIncrease(
          previousCountsRef.current,
          counts,
          baselineEstablishedRef.current,
        );

        onCountsRef.current(counts);

        if (options?.allowArrival !== false && arrived) {
          triggerArrival();
        }

        previousCountsRef.current = counts;
        baselineEstablishedRef.current = true;
      } catch {
        // Poll failures should not disrupt the backoffice shell.
      }
    }

    function handleRealtimeEvent(event: SupportChatRealtimeEvent) {
      if (!baselineEstablishedRef.current) {
        return;
      }

      if (isCustomerSupportArrivalEvent(event)) {
        triggerArrival();
      }

      void pollCounts({ allowArrival: false });
    }

    const unsubscribeSse = openSupportChatSse(
      "/support-messages/events",
      handleRealtimeEvent,
      {
        apiBaseUrl,
        // SSE düşəndə counts poll artıq işləyir — əlavə REST spam lazım deyil.
      },
    );

    void pollCounts({ allowArrival: false });
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void pollCounts();
      }
    }, pollIntervalMs);

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible" || cancelled) {
        return;
      }
      void pollCounts();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      unsubscribeSse();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [apiBaseUrl, enabled, pollIntervalMs]);
}
