"use client";

import type { OrderNavCountsContract } from "@itmarket/contracts";
import { useEffect, useRef } from "react";

import {
  detectNewOrderArrival,
  ORDER_ARRIVAL_POLL_INTERVAL_MS,
} from "./order-arrival-monitor";

type UseOrderArrivalMonitorOptions = {
  enabled: boolean;
  pollIntervalMs?: number;
  fetchCounts: () => Promise<OrderNavCountsContract>;
  onCounts: (counts: OrderNavCountsContract) => void;
  onArrival: (delta: number, counts: OrderNavCountsContract) => void;
};

export function useOrderArrivalMonitor({
  enabled,
  pollIntervalMs = ORDER_ARRIVAL_POLL_INTERVAL_MS,
  fetchCounts,
  onCounts,
  onArrival,
}: UseOrderArrivalMonitorOptions) {
  const previousCountsRef = useRef<OrderNavCountsContract | null>(null);
  const baselineEstablishedRef = useRef(false);
  const onCountsRef = useRef(onCounts);
  const onArrivalRef = useRef(onArrival);
  const fetchCountsRef = useRef(fetchCounts);

  onCountsRef.current = onCounts;
  onArrivalRef.current = onArrival;
  fetchCountsRef.current = fetchCounts;

  useEffect(() => {
    if (!enabled) {
      previousCountsRef.current = null;
      baselineEstablishedRef.current = false;
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const counts = await fetchCountsRef.current();
        if (cancelled) {
          return;
        }

        const { arrived, delta } = detectNewOrderArrival(
          previousCountsRef.current,
          counts,
          baselineEstablishedRef.current,
        );

        onCountsRef.current(counts);

        if (arrived) {
          onArrivalRef.current(delta, counts);
        }

        previousCountsRef.current = counts;
        baselineEstablishedRef.current = true;
      } catch {
        // Poll failures should not disrupt the backoffice shell.
      }
    }

    function startPolling() {
      void poll();
      return window.setInterval(() => {
        if (document.visibilityState === "visible") {
          void poll();
        }
      }, pollIntervalMs);
    }

    let intervalId = startPolling();

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible" || cancelled) {
        return;
      }

      void poll();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, pollIntervalMs]);
}
