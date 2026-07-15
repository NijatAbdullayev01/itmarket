"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { SiteLayout } from "./site-layout";

type StorefrontShellProps = {
  children: ReactNode;
  cartItemCount?: number;
  categories?: { id: string; name: string; slug: string }[];
};

export function StorefrontShell({
  children,
  cartItemCount = 0,
  categories = [],
}: StorefrontShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mainClassName = pathname.startsWith("/cart") ? "ui-main--cart" : undefined;
  const catalogClassName =
    pathname === "/" ? "ui-main--catalog" : mainClassName;
  const activeCategory =
    pathname === "/" ? (searchParams.get("category") ?? undefined) : undefined;

  return (
    <SiteLayout
      cartItemCount={cartItemCount}
      currentPath={pathname}
      categories={categories}
      activeCategory={activeCategory}
      mainClassName={catalogClassName}
    >
      {children}
    </SiteLayout>
  );
}
