import { Suspense } from "react";

import { BoSidebar } from "../components/bo-sidebar";
import { BoStaffProvider } from "../components/bo-staff-context";
import { Operations } from "../operations";

export default function BackofficeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <BoStaffProvider>
      <div className="bo-shell">
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
    </BoStaffProvider>
  );
}
