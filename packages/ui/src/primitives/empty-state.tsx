import type { ReactNode } from "react";

import { Button } from "../primitives/button";

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

  return (
    <div className={icon ? "ui-empty-state ui-empty-state--has-icon" : "ui-empty-state"}>
      {icon ? (
        <div
          className={
            iconTone === "error"
              ? "ui-empty-state__icon ui-empty-state__icon--error"
              : "ui-empty-state__icon"
          }
        >
          {icon}
        </div>
      ) : null}
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
