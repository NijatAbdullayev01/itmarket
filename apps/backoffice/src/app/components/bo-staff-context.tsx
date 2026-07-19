"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type BoStaffSummary = {
  displayName: string;
  role: string;
} | null;

type BoStaffContextValue = {
  staff: BoStaffSummary;
  setStaff: (staff: BoStaffSummary) => void;
  logout: () => void;
  registerLogout: (handler: (() => void) | null) => void;
};

const BoStaffContext = createContext<BoStaffContextValue | null>(null);

export function BoStaffProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<BoStaffSummary>(null);
  const logoutHandlerRef = useRef<(() => void) | null>(null);

  const logout = useCallback(() => {
    logoutHandlerRef.current?.();
  }, []);

  const registerLogout = useCallback((handler: (() => void) | null) => {
    logoutHandlerRef.current = handler;
  }, []);

  const value = useMemo(
    () => ({ staff, setStaff, logout, registerLogout }),
    [staff, logout, registerLogout],
  );

  return (
    <BoStaffContext.Provider value={value}>{children}</BoStaffContext.Provider>
  );
}

export function useBoStaff() {
  const context = useContext(BoStaffContext);
  if (!context) {
    throw new Error("useBoStaff must be used within BoStaffProvider");
  }
  return context;
}
