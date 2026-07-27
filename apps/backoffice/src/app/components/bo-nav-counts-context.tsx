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
  registeredCustomerCount: number | null;
  setRegisteredCustomerCount: (count: number | null) => void;
  unregisteredCustomerCount: number | null;
  setUnregisteredCustomerCount: (count: number | null) => void;
  pendingPreorderCount: number | null;
  setPendingPreorderCount: (count: number | null) => void;
  pendingSupportMessageCount: number | null;
  setPendingSupportMessageCount: (count: number | null) => void;
  newOrderAlert: boolean;
  setNewOrderAlert: (active: boolean) => void;
  newSupportMessageAlert: boolean;
  setNewSupportMessageAlert: (active: boolean) => void;
  newArrivalOrderIds: ReadonlySet<string>;
  addNewArrivalOrderIds: (ids: readonly string[]) => void;
  markNewOrderViewed: (id: string) => void;
};

const BoNavCountsContext = createContext<BoNavCountsContextValue | null>(null);

export function BoNavCountsProvider({ children }: { children: ReactNode }) {
  const [orderCounts, setOrderCounts] = useState<OrderNavCountsContract | null>(
    null,
  );
  const [registeredCustomerCount, setRegisteredCustomerCount] = useState<
    number | null
  >(null);
  const [unregisteredCustomerCount, setUnregisteredCustomerCount] = useState<
    number | null
  >(null);
  const [pendingPreorderCount, setPendingPreorderCount] = useState<
    number | null
  >(null);
  const [pendingSupportMessageCount, setPendingSupportMessageCount] = useState<
    number | null
  >(null);
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const [newSupportMessageAlert, setNewSupportMessageAlert] = useState(false);
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
      registeredCustomerCount,
      setRegisteredCustomerCount,
      unregisteredCustomerCount,
      setUnregisteredCustomerCount,
      pendingPreorderCount,
      setPendingPreorderCount,
      pendingSupportMessageCount,
      setPendingSupportMessageCount,
      newOrderAlert,
      setNewOrderAlert,
      newSupportMessageAlert,
      setNewSupportMessageAlert,
      newArrivalOrderIds,
      addNewArrivalOrderIds,
      markNewOrderViewed,
    }),
    [
      orderCounts,
      registeredCustomerCount,
      unregisteredCustomerCount,
      pendingPreorderCount,
      pendingSupportMessageCount,
      newOrderAlert,
      newSupportMessageAlert,
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
