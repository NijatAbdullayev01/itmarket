import type { ProductInstallmentTeaser } from "../utils/product-installment-teaser";

export type ProductCardInstallmentTeaserCopy = {
  months: string;
};

type ProductCardInstallmentTeaserProps = {
  plan: ProductInstallmentTeaser;
  copy: ProductCardInstallmentTeaserCopy;
};

export function ProductCardInstallmentTeaser({
  plan,
  copy,
}: ProductCardInstallmentTeaserProps) {
  return (
    <div className="ui-product-card__installment-teaser">
      <span className="ui-product-card__installment-teaser-amount">
        {plan.monthlyAmountFormatted}
      </span>
      <span
        className="ui-product-card__installment-teaser-separator"
        aria-hidden="true"
      >
        /
      </span>
      <span className="ui-product-card__installment-teaser-duration">
        {plan.months} {copy.months}
      </span>
    </div>
  );
}
