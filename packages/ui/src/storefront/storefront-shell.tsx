"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import type { StorefrontChromeCopy } from "./chrome-copy";
import type {
  HeaderCatalogBrand,
  HeaderCatalogCategory,
} from "./header-catalog-button";
import { SiteLayout } from "./site-layout";

type StorefrontShellProps = {
  children: ReactNode;
  cartItemCount?: number;
  authenticated?: boolean;
  languageSwitcher?: ReactNode;
  compareLink?: ReactNode;
  favoritesLink?: ReactNode;
  accountMenu?: ReactNode;
  subnav?: ReactNode;
  catalogCategories?: HeaderCatalogCategory[];
  catalogBrands?: HeaderCatalogBrand[];
  chromeCopy?: StorefrontChromeCopy;
};

export function StorefrontShell({
  children,
  cartItemCount = 0,
  authenticated = false,
  languageSwitcher,
  compareLink,
  favoritesLink,
  accountMenu,
  subnav,
  catalogCategories = [],
  catalogBrands = [],
  chromeCopy,
}: StorefrontShellProps) {
  const pathname = usePathname();
  const isAccountAuthPage =
    pathname === "/account/forgot-password" ||
    pathname === "/account/reset-password" ||
    (pathname === "/account" && !authenticated);
  const mainClassName =
    pathname.startsWith("/cart") || pathname === "/checkout"
      ? "ui-main--cart"
      : pathname.startsWith("/products/")
        ? "ui-main--product"
        : pathname === "/account"
          ? "ui-main--account"
          : pathname === "/compare"
            ? "ui-main--compare"
            : pathname === "/favorites"
              ? "ui-main--favorites"
              : undefined;
  const catalogClassName =
    pathname === "/" ? "ui-main--catalog" : mainClassName;

  if (isAccountAuthPage) {
    return children;
  }

  return (
    <SiteLayout
      cartItemCount={cartItemCount}
      currentPath={pathname}
      mainClassName={catalogClassName}
      languageSwitcher={languageSwitcher}
      compareLink={compareLink}
      favoritesLink={favoritesLink}
      accountMenu={accountMenu}
      subnav={pathname === "/account" ? undefined : subnav}
      catalogCategories={catalogCategories}
      catalogBrands={catalogBrands}
      chromeCopy={chromeCopy}
    >
      {children}
    </SiteLayout>
  );
}
