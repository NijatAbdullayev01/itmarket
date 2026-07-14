import type { ReactNode } from "react";

import { Button } from "../primitives/button";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="ui-empty-state">
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
    <a className="ui-btn ui-btn--primary" href={href}>
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
