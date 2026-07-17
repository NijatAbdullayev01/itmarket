"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { IconUser } from "./icons";

type HeaderAccountLinkProps = {
  authenticated?: boolean;
};

export function HeaderAccountLink({ authenticated = false }: HeaderAccountLinkProps) {
  const pathname = usePathname();
  const label = authenticated ? "Hesabım" : "Daxil ol";

  return (
    <Link
      href="/account"
      aria-current={pathname.startsWith("/account") ? "page" : undefined}
      className="ui-header-utilities__link"
      aria-label={label}
      title={label}
    >
      <span className="ui-header-utilities__icon" aria-hidden="true">
        <IconUser width={24} height={24} />
      </span>
      <span className="ui-header-utilities__label">{label}</span>
    </Link>
  );
}
