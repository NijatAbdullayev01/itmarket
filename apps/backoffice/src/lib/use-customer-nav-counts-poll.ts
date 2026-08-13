"use client";

import { useEffect, useRef } from "react";

import type { CustomerNavCountsContract } from "@itmarket/contracts";

export const CUSTOMER_NAV_COUNTS_POLL_INTERVAL_MS = 20_000;

type UseCustomerNavCountsPollOptions = {
  enabled: boolean;
  pollIntervalMs?: number;
  fetchCounts: () => Promise<CustomerNavCountsContract>;
  onCounts: (counts: CustomerNavCountsContract) => void;
};

export function useCustomerNavCountsPoll({
  enabled,
  pollIntervalMs = CUSTOMER_NAV_COUNTS_POLL_INTERVAL_MS,
  fetchCounts,
  onCounts,
}: UseCustomerNavCountsPollOptions) {
  const onCountsRef = useRef(onCounts);
  const fetchCountsRef = useRef(fetchCounts);

  useEffect(() => {
    onCountsRef.current = onCounts;
    fetchCountsRef.current = fetchCounts;
  }, [fetchCounts, onCounts]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const counts = await fetchCountsRef.current();
        if (cancelled) {
          return;
        }

        onCountsRef.current(counts);
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

    const intervalId = startPolling();

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
