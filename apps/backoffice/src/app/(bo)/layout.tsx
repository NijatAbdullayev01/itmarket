import { Suspense } from "react";

import { BoSidebar } from "../components/bo-sidebar";
import { BoNavCountsProvider } from "../components/bo-nav-counts-context";
import { BoOrderTabAlert } from "../components/bo-order-tab-alert";
import { BoStaffProvider } from "../components/bo-staff-context";
import { ScrollToTopOnNavigate } from "../components/scroll-to-top-on-navigate";
import { Operations } from "../operations";

export default function BackofficeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <BoStaffProvider>
      <BoNavCountsProvider>
      <BoOrderTabAlert />
      <div className="bo-shell">
        <Suspense fallback={null}>
          <ScrollToTopOnNavigate />
        </Suspense>
        <a className="skip-link" href="#staff-content">
          Əsas məzmuna keç
        </a>

        <div className="bo-layout">
          <Suspense fallback={null}>
            <BoSidebar />
          </Suspense>
          <Suspense fallback={null}>
            <Operations>{children}</Operations>
          </Suspense>
        </div>
      </div>
      </BoNavCountsProvider>
    </BoStaffProvider>
  );
}
