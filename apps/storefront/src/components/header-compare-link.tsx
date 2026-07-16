"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { IconCompare } from "@itmarket/ui";
import { useProductCompare } from "@/hooks/use-product-compare";

export function HeaderCompareLink() {
  const pathname = usePathname();
  const { count } = useProductCompare();
  const showBadge = count > 0;

  return (
    <Link
      href="/compare"
      aria-current={pathname.startsWith("/compare") ? "page" : undefined}
      className="ui-header-utilities__link"
      aria-label={showBadge ? `Müqayisə, ${count} məhsul` : "Müqayisə"}
      title="Müqayisə"
    >
      <span className="ui-header-utilities__icon" aria-hidden="true">
        <IconCompare width={24} height={24} />
        {showBadge ? (
          <span className="ui-header-utilities__badge">{count}</span>
        ) : null}
      </span>
      <span className="ui-header-utilities__label">Müqayisə</span>
    </Link>
  );
}
