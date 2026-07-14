import type { ReactNode } from "react";

type AlertVariant = "error" | "success" | "info";

type AlertProps = {
  variant?: AlertVariant;
  children: ReactNode;
};

export function Alert({ variant = "info", children }: AlertProps) {
  return (
    <div className={`ui-alert ui-alert--${variant}`} role="alert">
      {children}
    </div>
  );
}
