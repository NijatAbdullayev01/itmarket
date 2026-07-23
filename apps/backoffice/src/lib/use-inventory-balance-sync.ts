"use client";

import { useEffect, useRef } from "react";

import {
  detectInventoryBalanceSyncChange,
  INVENTORY_BALANCE_SYNC_POLL_INTERVAL_MS,
  type InventoryBalanceSyncState,
} from "./inventory-balance-sync";

type UseInventoryBalanceSyncOptions = {
  enabled: boolean;
  pollIntervalMs?: number;
  fetchSyncState: () => Promise<InventoryBalanceSyncState>;
  onChange: () => void;
};

export function useInventoryBalanceSync({
  enabled,
  pollIntervalMs = INVENTORY_BALANCE_SYNC_POLL_INTERVAL_MS,
  fetchSyncState,
  onChange,
}: UseInventoryBalanceSyncOptions) {
  const previousStateRef = useRef<InventoryBalanceSyncState | null>(null);
  const baselineEstablishedRef = useRef(false);
  const fetchSyncStateRef = useRef(fetchSyncState);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    fetchSyncStateRef.current = fetchSyncState;
    onChangeRef.current = onChange;
  }, [fetchSyncState, onChange]);

  useEffect(() => {
    if (!enabled) {
      previousStateRef.current = null;
      baselineEstablishedRef.current = false;
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const state = await fetchSyncStateRef.current();
        if (cancelled) {
          return;
        }

        if (
          detectInventoryBalanceSyncChange(
            previousStateRef.current,
            state,
            baselineEstablishedRef.current,
          )
        ) {
          onChangeRef.current();
        }

        previousStateRef.current = state;
        baselineEstablishedRef.current = true;
      } catch {
        // Poll failures should not disrupt the balance panel.
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
