import type { ReactNode } from "react";

import { Skeleton } from "../primitives/skeleton";

export type PageLoadingVariant =
  | "catalog"
  | "panel"
  | "product"
  | "compare"
  | "favorites"
  | "cart"
  | "soft";

type PageLoadingProps = {
  variant?: PageLoadingVariant;
  label?: string;
  title?: string;
  showTitle?: boolean;
  /** When false, omit the outer `.ui-container` (for nested page bodies). */
  framed?: boolean;
};

function ProductCardSkeleton() {
  return (
    <div className="ui-page-loading__card">
      <Skeleton className="ui-page-loading__card-media" radius="md" />
      <div className="ui-page-loading__card-body">
        <Skeleton height={12} width="42%" radius="pill" />
        <Skeleton height={16} width="88%" />
        <Skeleton height={16} width="64%" />
        <Skeleton height={20} width="36%" radius="pill" />
      </div>
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div className="ui-product-grid ui-page-loading__grid" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

function PanelTitle({ title }: { title?: string }) {
  if (title) {
    return <h1 className="ui-page-title ui-page-title--panel">{title}</h1>;
  }

  return (
    <div
      className="ui-page-title ui-page-title--panel ui-page-loading__title-panel"
      aria-hidden="true"
    >
      <Skeleton height={22} width="42%" radius="pill" />
    </div>
  );
}

function SoftSkeleton() {
  return (
    <div className="ui-page-loading__soft" aria-hidden="true">
      <Skeleton className="ui-page-loading__soft-bar" height={10} width="28%" radius="pill" />
      <Skeleton className="ui-page-loading__soft-block" height={120} width="100%" radius="lg" />
      <Skeleton className="ui-page-loading__soft-block" height={72} width="100%" radius="lg" />
    </div>
  );
}

function PanelSkeleton({
  showTitle,
  title,
  children,
}: {
  showTitle: boolean;
  title?: string;
  children: ReactNode;
}) {
  return (
    <>
      {showTitle ? <PanelTitle title={title} /> : null}
      {children}
    </>
  );
}

function CompareSkeleton() {
  return (
    <div className="ui-page-loading__compare" aria-hidden="true">
      <Skeleton className="ui-page-loading__toolbar" height={56} radius="md" />
      <div className="ui-page-loading__compare-table">
        <Skeleton className="ui-page-loading__compare-col" height={220} radius="lg" />
        <Skeleton className="ui-page-loading__compare-col" height={220} radius="lg" />
        <Skeleton className="ui-page-loading__compare-col" height={220} radius="lg" />
      </div>
      <div className="ui-page-loading__compare-rows">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} height={40} width="100%" radius="md" />
        ))}
      </div>
    </div>
  );
}

function FavoritesSkeleton() {
  return (
    <div className="ui-page-loading__favorites" aria-hidden="true">
      <Skeleton className="ui-page-loading__toolbar" height={56} radius="md" />
      <CatalogSkeleton />
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="ui-page-loading__cart" aria-hidden="true">
      <div className="ui-page-loading__cart-lines">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} height={120} width="100%" radius="lg" />
        ))}
      </div>
      <Skeleton className="ui-page-loading__cart-summary" height={280} radius="lg" />
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="ui-page-loading__product" aria-hidden="true">
      <div className="ui-page-loading__product-gallery">
        <Skeleton className="ui-page-loading__product-main" radius="lg" />
        <div className="ui-page-loading__product-thumbs">
          <Skeleton height={64} radius="md" />
          <Skeleton height={64} radius="md" />
          <Skeleton height={64} radius="md" />
          <Skeleton height={64} radius="md" />
        </div>
      </div>
      <div className="ui-page-loading__product-info">
        <Skeleton height={14} width="28%" radius="pill" />
        <Skeleton height={28} width="90%" />
        <Skeleton height={28} width="62%" />
        <Skeleton height={32} width="40%" radius="pill" />
        <Skeleton height={48} width="100%" radius="pill" />
        <Skeleton height={48} width="100%" radius="pill" />
        <Skeleton height={160} width="100%" radius="lg" />
      </div>
    </div>
  );
}

export function PageLoading({
  variant = "catalog",
  label = "Yüklənir…",
  title,
  showTitle = true,
  framed = true,
}: PageLoadingProps) {
  let body: ReactNode;

  switch (variant) {
    case "product":
      body = <ProductSkeleton />;
      break;
    case "compare":
      body = (
        <PanelSkeleton showTitle={showTitle} title={title}>
          <CompareSkeleton />
        </PanelSkeleton>
      );
      break;
    case "favorites":
      body = (
        <PanelSkeleton showTitle={showTitle} title={title}>
          <FavoritesSkeleton />
        </PanelSkeleton>
      );
      break;
    case "cart":
      body = (
        <PanelSkeleton showTitle={showTitle} title={title}>
          <CartSkeleton />
        </PanelSkeleton>
      );
      break;
    case "panel":
      body = (
        <PanelSkeleton showTitle={showTitle} title={title}>
          <div className="ui-page-loading__panel-body" aria-hidden="true">
            <Skeleton height={56} width="100%" radius="md" />
            <Skeleton height={180} width="100%" radius="lg" />
            <Skeleton height={120} width="100%" radius="lg" />
          </div>
        </PanelSkeleton>
      );
      break;
    case "soft":
      body = <SoftSkeleton />;
      break;
    case "catalog":
      body = <CatalogSkeleton />;
      break;
    default:
      body = <SoftSkeleton />;
      break;
  }

  const className = [
    framed ? "ui-container" : null,
    "ui-page-loading",
    "ui-page-enter",
    `ui-page-loading--${variant}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      {body}
    </div>
  );
}
