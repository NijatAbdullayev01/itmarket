import type { ReactNode } from "react";

import { Button } from "../primitives/button";
import { IconPackage } from "../storefront/icons";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  iconTone?: "default" | "error";
  titleAs?: "h1" | "h2";
};

export function EmptyState({
  title,
  description,
  action,
  icon,
  iconTone = "default",
  titleAs = "h2",
}: EmptyStateProps) {
  const TitleTag = titleAs;
  const renderedIcon = icon ?? <IconPackage />;

  return (
    <div className="ui-empty-state ui-empty-state--has-icon">
      <div
        className={
          iconTone === "error"
            ? "ui-empty-state__icon ui-empty-state__icon--error"
            : "ui-empty-state__icon"
        }
      >
        {renderedIcon}
      </div>
      <TitleTag className="ui-empty-state__title">{title}</TitleTag>
      {description ? <p className="ui-empty-state__body">{description}</p> : null}
      {action}
    </div>
  );
}

export function EmptyStateLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a className="ui-btn ui-empty-state__action" href={href}>
      {label}
    </a>
  );
}

export function EmptyStateButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button type="button" onClick={onClick}>
      {label}
    </Button>
  );
}
