"use client";

import {
  CartCompleteBar,
  type CartCompleteBarItem,
} from "@itmarket/ui";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { getCartCompleteBarSummary } from "@/app/actions";
import { useMessages } from "@/components/locale-provider";
import { toCartCompleteBarCopy } from "@/lib/i18n";
import type { CartCompleteBarSummary } from "@/lib/cart-complete-bar";
import { CART_ADDED_EVENT } from "@/lib/cart-added-toast";

type BarState = {
  itemCount: number;
  subtotal: string | null;
  items: CartCompleteBarItem[];
};

function toBarState(summary: CartCompleteBarSummary): BarState {
  return {
    itemCount: summary.itemCount,
    subtotal: summary.subtotal,
    items: summary.items,
  };
}

/**
 * Sticky checkout prompt after add-to-cart.
 * Anchored bottom-left with live cart count, total, and thumbnails.
 * Stays visible across storefront navigation until the shopper
 * opens the cart (CTA / header) or dismisses the bar.
 */
export function CartCompleteBarHost() {
  const messages = useMessages();
  const pathname = usePathname();
  const [barRequested, setBarRequested] = useState(false);
  const [barState, setBarState] = useState<BarState>({
    itemCount: 0,
    subtotal: null,
    items: [],
  });
  const onCartPage = pathname.startsWith("/cart");
  const visible = barRequested && !onCartPage;

  const hide = useCallback(() => {
    setBarRequested(false);
  }, []);

  const show = useCallback(() => {
    if (pathname.startsWith("/cart")) return;

    void getCartCompleteBarSummary().then((summary) => {
      if (summary === null) return;
      setBarState(toBarState(summary));
      setBarRequested(true);
    });
  }, [pathname]);

  // Any cart entry (CTA, header icon, direct URL) completes the prompt.
  useEffect(() => {
    if (onCartPage) {
      setBarRequested(false);
    }
  }, [onCartPage]);

  useEffect(() => {
    window.addEventListener(CART_ADDED_EVENT, show);
    return () => {
      window.removeEventListener(CART_ADDED_EVENT, show);
    };
  }, [show]);

  return (
    <CartCompleteBar
      visible={visible}
      onDismiss={hide}
      itemCount={barState.itemCount}
      subtotal={barState.subtotal}
      items={barState.items}
      copy={toCartCompleteBarCopy(messages)}
    />
  );
}
