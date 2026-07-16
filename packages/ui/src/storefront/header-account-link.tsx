"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { IconUser } from "./icons";

export function HeaderAccountLink() {
  const pathname = usePathname();

  return (
    <Link
      href="/account"
      aria-current={pathname.startsWith("/account") ? "page" : undefined}
      className="ui-header-utilities__link"
      aria-label="Hesab"
      title="Hesab"
    >
      <span className="ui-header-utilities__icon" aria-hidden="true">
        <IconUser width={24} height={24} />
      </span>
      <span className="ui-header-utilities__label">Hesab</span>
    </Link>
  );
}
