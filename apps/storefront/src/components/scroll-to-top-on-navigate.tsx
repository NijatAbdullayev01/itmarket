"use client";

import { useLayoutEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { resetStorefrontScroll } from "@/lib/reset-storefront-scroll";

export function ScrollToTopOnNavigate() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    resetStorefrontScroll();
    const frame = window.requestAnimationFrame(resetStorefrontScroll);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [pathname, searchKey]);

  return null;
}
