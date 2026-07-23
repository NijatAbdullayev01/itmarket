"use client";

import { CartCompleteBar } from "@itmarket/ui";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { CART_ADDED_EVENT } from "@/lib/cart-added-toast";

const AUTO_DISMISS_MS = 5000;

export function CartCompleteBarHost() {
  const pathname = usePathname();
  const [barRequested, setBarRequested] = useState(false);
  const dismissTimer = useRef<number | null>(null);
  const visible = barRequested && !pathname.startsWith("/cart");

  const hide = useCallback(() => {
    setBarRequested(false);
    if (dismissTimer.current !== null) {
      window.clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  }, []);

  const show = useCallback(() => {
    if (pathname.startsWith("/cart")) return;

    setBarRequested(true);
    if (dismissTimer.current !== null) {
      window.clearTimeout(dismissTimer.current);
    }
    dismissTimer.current = window.setTimeout(hide, AUTO_DISMISS_MS);
  }, [hide, pathname]);

  useEffect(() => {
    window.addEventListener(CART_ADDED_EVENT, show);
    return () => {
      window.removeEventListener(CART_ADDED_EVENT, show);
      if (dismissTimer.current !== null) {
        window.clearTimeout(dismissTimer.current);
      }
    };
  }, [show]);

  return <CartCompleteBar visible={visible} onDismiss={hide} />;
}
