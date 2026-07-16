import Link from "next/link";

import { IconChevronRight } from "@itmarket/ui";

type ProductBreadcrumbProps = {
  categoryName: string;
  categorySlug: string;
  productName: string;
};

export function ProductBreadcrumb({
  categoryName,
  categorySlug,
  productName,
}: ProductBreadcrumbProps) {
  const categoryHref = `/?category=${encodeURIComponent(categorySlug)}`;

  return (
    <div className="ui-product-breadcrumb-bar">
      <div className="ui-container">
        <nav className="ui-breadcrumb ui-breadcrumb--product" aria-label="Səhifə yolu">
          <Link href="/">Əsas səhifə</Link>
          <span className="ui-breadcrumb__sep" aria-hidden="true">
            <IconChevronRight />
          </span>
          <Link href={categoryHref}>{categoryName}</Link>
          <span className="ui-breadcrumb__sep" aria-hidden="true">
            <IconChevronRight />
          </span>
          <span className="ui-breadcrumb__current">{productName}</span>
        </nav>
      </div>
    </div>
  );
}
