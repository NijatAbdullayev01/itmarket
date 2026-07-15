type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <img
      src="/images/logo.png"
      alt="ITMarket"
      width={2164}
      height={416}
      className={className ?? "ui-brand__logo"}
      decoding="async"
    />
  );
}
