"use client";

import type { ReactNode } from "react";

import { StorefrontShell } from "@itmarket/ui";
import { CartCompleteBarHost } from "@/components/cart-complete-bar-host";
import { HeaderAccountLink } from "@/components/header-account-link";
import { HeaderCompareLink } from "@/components/header-compare-link";
import { HeaderFavoritesLink } from "@/components/header-favorites-link";
import { ScrollToTopOnNavigate } from "@/components/scroll-to-top-on-navigate";

type StorefrontAppShellProps = {
  children: ReactNode;
  cartItemCount?: number;
  subnav?: ReactNode;
};

export function StorefrontAppShell({
  children,
  cartItemCount = 0,
  subnav,
}: StorefrontAppShellProps) {
  return (
    <>
      <ScrollToTopOnNavigate />
      <CartCompleteBarHost />
      <StorefrontShell
        cartItemCount={cartItemCount}
        compareLink={<HeaderCompareLink />}
        favoritesLink={<HeaderFavoritesLink />}
        accountMenu={<HeaderAccountLink />}
        subnav={subnav}
      >
        {children}
      </StorefrontShell>
    </>
  );
}
