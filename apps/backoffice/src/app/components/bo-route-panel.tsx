"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import {
  getBoRouteId,
  isOrdersListRouteId,
  type BoRouteId,
} from "./bo-nav-config";

type BoRouteAlertsValue = {
  message: string;
  error: string;
  route: BoRouteId | null;
};

const BoRouteAlertsContext = createContext<BoRouteAlertsValue | null>(null);

export function BoRouteAlertsProvider({
  value,
  children,
}: {
  value: BoRouteAlertsValue;
  children: ReactNode;
}) {
  return (
    <BoRouteAlertsContext.Provider value={value}>
      {children}
    </BoRouteAlertsContext.Provider>
  );
}

function BoRouteAlertsBanner() {
  const alerts = useContext(BoRouteAlertsContext);
  if (alerts === null) {
    return null;
  }

  const { message, error } = alerts;
  if (!message && !error) {
    return null;
  }

  return (
    <div className="bo-dashboard-alerts">
      {message ? (
        <p className="form-success" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type BoRoutePanelProps = {
  route: BoRouteId | BoRouteId[];
  children: ReactNode;
};

export function BoRoutePanel({ route, children }: BoRoutePanelProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRoute = getBoRouteId(pathname, searchParams);
  const allowedRoutes = Array.isArray(route) ? route : [route];
  const alerts = useContext(BoRouteAlertsContext);

  const routeMatches =
    allowedRoutes.includes(currentRoute) ||
    (allowedRoutes.some((entry) => isOrdersListRouteId(entry)) &&
      isOrdersListRouteId(currentRoute));

  if (!routeMatches) {
    return null;
  }

  const showAlerts =
    alerts !== null &&
    alerts.route === currentRoute &&
    (alerts.message.length > 0 || alerts.error.length > 0);

  return (
    <>
      {showAlerts ? <BoRouteAlertsBanner /> : null}
      {children}
    </>
  );
}
