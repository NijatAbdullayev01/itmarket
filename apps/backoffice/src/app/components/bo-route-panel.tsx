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

export type BoRouteAlertsValue = {
  message: string;
  error: string;
  route: BoRouteId | null;
};

function routeAlertMatches(
  activeRoute: BoRouteId,
  alertRoute: BoRouteId | null,
): boolean {
  if (alertRoute === null) {
    return false;
  }
  if (alertRoute === activeRoute) {
    return true;
  }
  return (
    isOrdersListRouteId(alertRoute) && isOrdersListRouteId(activeRoute)
  );
}

export function shouldShowBoRouteAlerts(
  activeRoute: BoRouteId,
  alerts: BoRouteAlertsValue | null,
): boolean {
  if (alerts === null) {
    return false;
  }

  const hasText = alerts.message.length > 0 || alerts.error.length > 0;
  if (!hasText) {
    return false;
  }
  return routeAlertMatches(activeRoute, alerts.route);
}

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

export function BoRouteAlertsBanner() {
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

  const routeMatches =
    allowedRoutes.includes(currentRoute) ||
    (allowedRoutes.some((entry) => isOrdersListRouteId(entry)) &&
      isOrdersListRouteId(currentRoute));

  if (!routeMatches) {
    return null;
  }

  return children;
}
