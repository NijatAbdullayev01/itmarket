"use client";

import type { StaffAvailabilityRequestNavCountsContract } from "@itmarket/contracts";
import { useEffect, useRef } from "react";

import {
  detectInquiryArrival,
  INQUIRY_ARRIVAL_POLL_INTERVAL_MS,
  type InquiryArrivalKinds,
} from "./inquiry-arrival-monitor";

type UseInquiryArrivalMonitorOptions = {
  enabled: boolean;
  pollIntervalMs?: number;
  fetchCounts: () => Promise<StaffAvailabilityRequestNavCountsContract>;
  onCounts: (counts: StaffAvailabilityRequestNavCountsContract) => void;
  onArrival: (kinds: InquiryArrivalKinds) => void;
};

export function useInquiryArrivalMonitor({
  enabled,
  pollIntervalMs = INQUIRY_ARRIVAL_POLL_INTERVAL_MS,
  fetchCounts,
  onCounts,
  onArrival,
}: UseInquiryArrivalMonitorOptions) {
  const previousCountsRef =
    useRef<StaffAvailabilityRequestNavCountsContract | null>(null);
  const baselineEstablishedRef = useRef(false);
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
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const counts = await fetchCountsRef.current();
        if (cancelled) {
          return;
        }

        const { arrived, kinds } = detectInquiryArrival(
          previousCountsRef.current,
          counts,
          baselineEstablishedRef.current,
        );

        onCountsRef.current(counts);

        if (arrived) {
          onArrivalRef.current(kinds);
        }

        previousCountsRef.current = counts;
        baselineEstablishedRef.current = true;
      } catch {
        // Poll failures should not disrupt the backoffice shell.
      }
    }

    function startPolling() {
      void poll();
      // Digər tab açıq olsa belə poll davam etsin — bildiriş səsi gizli tabda da gəlsin.
      return window.setInterval(() => {
        void poll();
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
