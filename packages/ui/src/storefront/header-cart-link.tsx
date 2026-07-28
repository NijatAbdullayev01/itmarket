"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  formatChromeMessage,
  type StorefrontChromeCopy,
} from "./chrome-copy";
import { IconCart } from "./icons";

type HeaderCartLinkProps = {
  cartItemCount?: number;
  /** Count not known yet — reserve badge geometry without claiming "0". */
  badgePending?: boolean;
  chromeCopy: Pick<StorefrontChromeCopy, "cart" | "cartWithCount">;
};

export function HeaderCartLink({
  cartItemCount = 0,
  badgePending = false,
  chromeCopy,
}: HeaderCartLinkProps) {
  const pathname = usePathname();
  const showBadge = !badgePending && cartItemCount > 0;
  const cartAria = showBadge
    ? formatChromeMessage(chromeCopy.cartWithCount, { count: cartItemCount })
    : chromeCopy.cart;

  return (
    <Link
      href="/cart"
      aria-current={pathname.startsWith("/cart") ? "page" : undefined}
      className="ui-header-utilities__link ui-header-utilities__link--cart"
      aria-label={cartAria}
      title={chromeCopy.cart}
      aria-busy={badgePending || undefined}
      prefetch
    >
      <span className="ui-header-utilities__icon" aria-hidden="true">
        <IconCart width={24} height={24} />
        {badgePending ? (
          <span className="ui-header-utilities__badge ui-header-utilities__badge--pending" />
        ) : showBadge ? (
          <span className="ui-header-utilities__badge">{cartItemCount}</span>
        ) : null}
      </span>
      <span className="ui-header-utilities__label">{chromeCopy.cart}</span>
    </Link>
  );
}
