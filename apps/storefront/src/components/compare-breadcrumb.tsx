import Link from "next/link";

import { IconChevronRight } from "@itmarket/ui";

export function CompareBreadcrumb() {
  return (
    <div className="ui-product-breadcrumb-bar">
      <div className="ui-container">
        <nav className="ui-breadcrumb ui-breadcrumb--product" aria-label="Səhifə yolu">
          <Link href="/">Əsas səhifə</Link>
          <span className="ui-breadcrumb__sep" aria-hidden="true">
            <IconChevronRight />
          </span>
          <span className="ui-breadcrumb__current">Müqayisə</span>
        </nav>
      </div>
    </div>
  );
}
