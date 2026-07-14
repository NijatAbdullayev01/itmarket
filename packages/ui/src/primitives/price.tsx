type PriceProps = {
  value: string;
  variant?: "default" | "sale" | "previous";
};

export function Price({ value, variant = "default" }: PriceProps) {
  return <span className={`ui-price ui-price--${variant}`}>{value}</span>;
}
