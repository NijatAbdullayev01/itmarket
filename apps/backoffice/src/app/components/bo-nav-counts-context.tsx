"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { OrderNavCountsContract } from "@itmarket/contracts";

import {
  loadNewOrderHighlightIds,
  markNewOrderViewedInStorage,
  mergeNewOrderHighlightIds,
  saveNewOrderHighlightIds,
} from "../../lib/order-new-arrival-highlight";

type BoNavCountsContextValue = {
  orderCounts: OrderNavCountsContract | null;
  setOrderCounts: (counts: OrderNavCountsContract | null) => void;
  newOrderAlert: boolean;
  setNewOrderAlert: (active: boolean) => void;
  newArrivalOrderIds: ReadonlySet<string>;
  addNewArrivalOrderIds: (ids: readonly string[]) => void;
  markNewOrderViewed: (id: string) => void;
};

const BoNavCountsContext = createContext<BoNavCountsContextValue | null>(null);

export function BoNavCountsProvider({ children }: { children: ReactNode }) {
  const [orderCounts, setOrderCounts] = useState<OrderNavCountsContract | null>(
    null,
  );
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const [newArrivalOrderIds, setNewArrivalOrderIds] = useState<
    ReadonlySet<string>
  >(() => loadNewOrderHighlightIds());

  const addNewArrivalOrderIds = useCallback((ids: readonly string[]) => {
    if (ids.length === 0) {
      return;
    }

    setNewArrivalOrderIds((current) => mergeNewOrderHighlightIds(current, ids));
  }, []);

  const markNewOrderViewed = useCallback((id: string) => {
    markNewOrderViewedInStorage(id);
    setNewArrivalOrderIds((current) => {
      if (!current.has(id)) {
        return current;
      }

      const next = new Set(current);
      next.delete(id);
      saveNewOrderHighlightIds(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      orderCounts,
      setOrderCounts,
      newOrderAlert,
      setNewOrderAlert,
      newArrivalOrderIds,
      addNewArrivalOrderIds,
      markNewOrderViewed,
    }),
    [
      orderCounts,
      newOrderAlert,
      newArrivalOrderIds,
      addNewArrivalOrderIds,
      markNewOrderViewed,
    ],
  );

  return (
    <BoNavCountsContext.Provider value={value}>
      {children}
    </BoNavCountsContext.Provider>
  );
}

export function useBoNavCounts() {
  const context = useContext(BoNavCountsContext);
  if (!context) {
    throw new Error("useBoNavCounts must be used within BoNavCountsProvider");
  }
  return context;
}
