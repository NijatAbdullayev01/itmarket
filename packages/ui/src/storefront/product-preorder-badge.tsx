import { Badge } from "../primitives/badge";

type ProductPreorderBadgeProps = {
  label?: string;
};

export function ProductPreorderBadge({
  label = "M\u00F6vcud deyil",
}: ProductPreorderBadgeProps) {
  return (
    <div className="ui-product-preorder-badge">
      <Badge variant="error">{label}</Badge>
    </div>
  );
}
