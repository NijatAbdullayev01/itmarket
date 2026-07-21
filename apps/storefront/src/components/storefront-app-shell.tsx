"use client";

import { Suspense, type ReactNode } from "react";

import { StorefrontShell } from "@itmarket/ui";
import { CartCompleteBarHost } from "@/components/cart-complete-bar-host";
import { HeaderAccountLink } from "@/components/header-account-link";
import { HeaderCompareLink } from "@/components/header-compare-link";
import { HeaderFavoritesLink } from "@/components/header-favorites-link";
import { ScrollToTopOnNavigate } from "@/components/scroll-to-top-on-navigate";

type StorefrontAppShellProps = {
  children: ReactNode;
  cartItemCount?: number;
  authenticated?: boolean;
  subnav?: ReactNode;
};

export function StorefrontAppShell({
  children,
  cartItemCount = 0,
  authenticated = false,
  subnav,
}: StorefrontAppShellProps) {
  return (
    <>
      <Suspense fallback={null}>
        <ScrollToTopOnNavigate />
      </Suspense>
      <CartCompleteBarHost />
      <StorefrontShell
        cartItemCount={cartItemCount}
        authenticated={authenticated}
        compareLink={<HeaderCompareLink />}
        favoritesLink={<HeaderFavoritesLink />}
        accountMenu={<HeaderAccountLink authenticated={authenticated} />}
        subnav={subnav}
      >
        {children}
      </StorefrontShell>
    </>
  );
}
