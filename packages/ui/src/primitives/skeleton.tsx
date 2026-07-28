import type { CSSProperties, HTMLAttributes } from "react";

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  radius?: "sm" | "md" | "lg" | "pill" | "full";
};

const radiusClass: Record<NonNullable<SkeletonProps["radius"]>, string> = {
  sm: "ui-skeleton--radius-sm",
  md: "ui-skeleton--radius-md",
  lg: "ui-skeleton--radius-lg",
  pill: "ui-skeleton--radius-pill",
  full: "ui-skeleton--radius-full",
};

export function Skeleton({
  className,
  width,
  height,
  radius = "md",
  style,
  ...props
}: SkeletonProps) {
  const classes = ["ui-skeleton", radiusClass[radius], className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      style={{ width, height, ...style }}
      aria-hidden="true"
      {...props}
    />
  );
}
