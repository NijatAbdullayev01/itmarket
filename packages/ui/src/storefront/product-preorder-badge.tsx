import { Badge } from "../primitives/badge";

type ProductPreorderBadgeProps = {
  label?: string;
  /** `warning` (sarı) — sifarişlə mövcud; `error` (qırmızı) — mövcud deyil */
  variant?: "warning" | "error";
};

export function ProductPreorderBadge({
  label = "M\u00F6vcud deyil",
  variant = "error",
}: ProductPreorderBadgeProps) {
  const className =
    variant === "warning"
      ? "ui-product-preorder-badge ui-product-preorder-badge--yellow"
      : "ui-product-preorder-badge";

  return (
    <div className={className}>
      <Badge variant={variant}>{label}</Badge>
    </div>
  );
}
