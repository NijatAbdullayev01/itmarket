import Link from "next/link";

import { IconChevronRight } from "@itmarket/ui";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { getMessages } from "@/lib/i18n";

type CatalogSearchBreadcrumbProps = {
  label: string;
};

export async function CatalogSearchBreadcrumb({ label }: CatalogSearchBreadcrumbProps) {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  return (
    <div className="ui-product-breadcrumb-bar">
      <div className="ui-container">
        <nav className="ui-breadcrumb ui-breadcrumb--product" aria-label={messages.common.breadcrumbNav}>
          <Link href="/">{messages.common.home}</Link>
          <span className="ui-breadcrumb__sep" aria-hidden="true">
            <IconChevronRight />
          </span>
          <span className="ui-breadcrumb__current">{label}</span>
        </nav>
      </div>
    </div>
  );
}
