"use client";

import { usePathname } from "next/navigation";
import { SubnavLoadingFallback } from "@itmarket/ui";

/** Height-stable bar except on home, which has no breadcrumb. */
export default function SubnavLoading() {
  const pathname = usePathname();
  if (pathname === "/") {
    return null;
  }
  return <SubnavLoadingFallback />;
}
