"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { IconCompare } from "@itmarket/ui";
import { useLocale } from "@/components/locale-provider";
import { useProductCompare } from "@/hooks/use-product-compare";
import { formatMessage } from "@/lib/i18n";

export function HeaderCompareLink() {
  const pathname = usePathname();
  const { messages } = useLocale();
  const { count } = useProductCompare();
  const showBadge = count > 0;
  const label = messages.header.compare;
  const ariaLabel = showBadge
    ? formatMessage(messages.header.compareWithCount, { count })
    : label;

  return (
    <Link
      href="/compare"
      aria-current={pathname.startsWith("/compare") ? "page" : undefined}
      className="ui-header-utilities__link"
      aria-label={ariaLabel}
      title={label}
    >
      <span className="ui-header-utilities__icon" aria-hidden="true">
        <IconCompare width={24} height={24} />
        {showBadge ? (
          <span className="ui-header-utilities__badge">{count}</span>
        ) : null}
      </span>
      <span className="ui-header-utilities__label">{label}</span>
    </Link>
  );
}
