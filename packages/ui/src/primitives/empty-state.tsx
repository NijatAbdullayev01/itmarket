import type { ReactNode } from "react";

import { Button } from "../primitives/button";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
};

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className={icon ? "ui-empty-state ui-empty-state--has-icon" : "ui-empty-state"}>
      {icon ? <div className="ui-empty-state__icon">{icon}</div> : null}
      <h2 className="ui-empty-state__title">{title}</h2>
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
    <a className="ui-btn" href={href}>
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
