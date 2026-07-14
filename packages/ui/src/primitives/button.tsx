import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  block?: boolean;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  block = false,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const classes = [
    "ui-btn",
    `ui-btn--${variant}`,
    block ? "ui-btn--block" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} type={type} {...props}>
      {children}
    </button>
  );
}
