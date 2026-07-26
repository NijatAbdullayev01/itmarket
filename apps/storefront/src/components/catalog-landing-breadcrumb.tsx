import Link from "next/link";

import { IconChevronRight } from "@itmarket/ui";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { DEFAULT_LOCALE, getMessages } from "@/lib/i18n";
import {
  buildBreadcrumbListJsonLd,
  type BreadcrumbTrailItem,
  toJsonLd,
} from "@/lib/seo";

type CatalogLandingBreadcrumbProps = {
  trail: BreadcrumbTrailItem[];
  currentName: string;
  /** AZ-primary names for BreadcrumbList JSON-LD; defaults to `trail`. */
  seoTrail?: BreadcrumbTrailItem[];
};

export async function CatalogLandingBreadcrumb({
  trail,
  currentName,
  seoTrail,
}: CatalogLandingBreadcrumbProps) {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const azHome = getMessages(DEFAULT_LOCALE).common.home;
  const ancestors = trail.slice(0, -1);
  const jsonLdItems = seoTrail ?? trail;

  return (
    <div className="ui-product-breadcrumb-bar">
      <div className="ui-container">
        <nav className="ui-breadcrumb ui-breadcrumb--product" aria-label={messages.common.breadcrumbNav}>
          <Link href="/">{messages.common.home}</Link>
          {ancestors.map((item) => (
            <span key={item.path} className="ui-breadcrumb__segment">
              <span className="ui-breadcrumb__sep" aria-hidden="true">
                <IconChevronRight />
              </span>
              <Link href={item.path}>{item.name}</Link>
            </span>
          ))}
          <span className="ui-breadcrumb__sep" aria-hidden="true">
            <IconChevronRight />
          </span>
          <span className="ui-breadcrumb__current">{currentName}</span>
        </nav>
      </div>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: toJsonLd(buildBreadcrumbListJsonLd(jsonLdItems, azHome)),
        }}
      />
    </div>
  );
}
