"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SiteLayout } from "./site-layout";

type StorefrontShellProps = {
  children: ReactNode;
  cartItemCount?: number;
};

export function StorefrontShell({
  children,
  cartItemCount = 0,
}: StorefrontShellProps) {
  const pathname = usePathname();
  const mainClassName = pathname.startsWith("/cart") ? "ui-main--cart" : undefined;
  const catalogClassName =
    pathname === "/" ? "ui-main--catalog" : mainClassName;

  return (
    <SiteLayout
      cartItemCount={cartItemCount}
      currentPath={pathname}
      mainClassName={catalogClassName}
    >
      {children}
    </SiteLayout>
  );
}
