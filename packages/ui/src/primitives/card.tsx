import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  outlined?: boolean;
  className?: string;
};

export function Card({ children, outlined = false, className }: CardProps) {
  const classes = [
    "ui-card",
    outlined ? "ui-card--outlined" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}
