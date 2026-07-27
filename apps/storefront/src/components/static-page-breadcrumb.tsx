import Link from "next/link";

import { IconChevronRight } from "@itmarket/ui";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { getMessages } from "@/lib/i18n";

type StaticPageBreadcrumbParent = {
  label: string;
  href: string;
};

type StaticPageBreadcrumbProps = {
  current: string;
  parents?: StaticPageBreadcrumbParent[];
};

export async function StaticPageBreadcrumb({
  current,
  parents = [],
}: StaticPageBreadcrumbProps) {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  return (
    <div className="ui-product-breadcrumb-bar">
      <div className="ui-container">
        <nav className="ui-breadcrumb ui-breadcrumb--product" aria-label={messages.common.breadcrumbNav}>
          <Link href="/">{messages.common.home}</Link>
          {parents.map((item) => (
            <span key={item.href} className="ui-breadcrumb__segment">
              <span className="ui-breadcrumb__sep" aria-hidden="true">
                <IconChevronRight />
              </span>
              <Link href={item.href}>{item.label}</Link>
            </span>
          ))}
          <span className="ui-breadcrumb__sep" aria-hidden="true">
            <IconChevronRight />
          </span>
          <span className="ui-breadcrumb__current">{current}</span>
        </nav>
      </div>
    </div>
  );
}
