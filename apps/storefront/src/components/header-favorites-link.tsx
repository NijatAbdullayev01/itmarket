"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { IconHeart } from "@itmarket/ui";
import { useProductFavorites } from "@/hooks/use-product-favorites";

export function HeaderFavoritesLink() {
  const pathname = usePathname();
  const { count } = useProductFavorites();
  const showBadge = count > 0;

  return (
    <Link
      href="/favorites"
      aria-current={pathname.startsWith("/favorites") ? "page" : undefined}
      className="ui-header-utilities__link"
      aria-label={showBadge ? `Sevimlilər, ${count} məhsul` : "Sevimlilər"}
      title="Sevimlilər"
    >
      <span className="ui-header-utilities__icon" aria-hidden="true">
        <IconHeart width={24} height={24} />
        {showBadge ? (
          <span className="ui-header-utilities__badge">{count}</span>
        ) : null}
      </span>
      <span className="ui-header-utilities__label">Sevimlilər</span>
    </Link>
  );
}
