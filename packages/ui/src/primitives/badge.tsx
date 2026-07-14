import type { ReactNode } from "react";

type BadgeVariant = "success" | "warning" | "error" | "neutral";

type BadgeProps = {
  variant?: BadgeVariant;
  children: ReactNode;
};

export function Badge({ variant = "neutral", children }: BadgeProps) {
  return <span className={`ui-badge ui-badge--${variant}`}>{children}</span>;
}
