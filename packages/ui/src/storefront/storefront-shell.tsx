"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SiteLayout } from "./site-layout";

type StorefrontShellProps = {
  children: ReactNode;
  cartItemCount?: number;
  compareLink?: ReactNode;
  favoritesLink?: ReactNode;
  accountMenu?: ReactNode;
  subnav?: ReactNode;
};

export function StorefrontShell({
  children,
  cartItemCount = 0,
  compareLink,
  favoritesLink,
  accountMenu,
  subnav,
}: StorefrontShellProps) {
  const pathname = usePathname();
  const isAccountPage = pathname.startsWith("/account");
  const mainClassName =
    pathname.startsWith("/cart") || pathname === "/checkout"
      ? "ui-main--cart"
      : pathname.startsWith("/products/")
        ? "ui-main--product"
        : undefined;
  const catalogClassName =
    pathname === "/" ? "ui-main--catalog" : mainClassName;

  if (isAccountPage) {
    return children;
  }

  return (
    <SiteLayout
      cartItemCount={cartItemCount}
      currentPath={pathname}
      mainClassName={catalogClassName}
      compareLink={compareLink}
      favoritesLink={favoritesLink}
      accountMenu={accountMenu}
      subnav={subnav}
    >
      {children}
    </SiteLayout>
  );
}
