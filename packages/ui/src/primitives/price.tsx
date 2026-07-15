type PriceProps = {
  value: string;
  variant?: "default" | "sale" | "previous";
  className?: string;
};

export function Price({ value, variant = "default", className }: PriceProps) {
  const classes = [`ui-price`, `ui-price--${variant}`, className]
    .filter(Boolean)
    .join(" ");
  return <span className={classes}>{value}</span>;
}
