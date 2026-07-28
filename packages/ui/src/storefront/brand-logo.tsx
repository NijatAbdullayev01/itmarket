type BrandLogoProps = {
  className?: string;
};

/**
 * Display-size width/height (not the PNG's 2164×416) so hard refresh does not
 * paint a full-bleed logo before components.css applies `.ui-brand__logo`.
 * Aspect ≈ 2164/416 ≈ 5.2 → 208×40 matches desktop `height: 40px; width: auto`.
 * Do not put height in inline style — media queries must be able to shrink it.
 */
const LOGO_DISPLAY_WIDTH = 208;
const LOGO_DISPLAY_HEIGHT = 40;

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <img
      src="/images/logo.png"
      alt="ITMarket"
      width={LOGO_DISPLAY_WIDTH}
      height={LOGO_DISPLAY_HEIGHT}
      className={className ?? "ui-brand__logo"}
      decoding="async"
    />
  );
}
