"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { IconHeart } from "@itmarket/ui";
import { useLocale } from "@/components/locale-provider";
import { useProductFavorites } from "@/hooks/use-product-favorites";
import { formatMessage } from "@/lib/i18n";

export function HeaderFavoritesLink() {
  const pathname = usePathname();
  const { messages } = useLocale();
  const { count } = useProductFavorites();
  const showBadge = count > 0;
  const label = messages.header.favorites;
  const ariaLabel = showBadge
    ? formatMessage(messages.header.favoritesWithCount, { count })
    : label;

  return (
    <Link
      href="/favorites"
      aria-current={pathname.startsWith("/favorites") ? "page" : undefined}
      className="ui-header-utilities__link"
      aria-label={ariaLabel}
      title={label}
    >
      <span className="ui-header-utilities__icon" aria-hidden="true">
        <IconHeart width={24} height={24} />
        {showBadge ? (
          <span className="ui-header-utilities__badge">{count}</span>
        ) : null}
      </span>
      <span className="ui-header-utilities__label">{label}</span>
    </Link>
  );
}
