"use client";

import Image from "next/image";
import type { MediaImageProps } from "@itmarket/ui";

function isOptimizableSrc(src: string): boolean {
  // Uploaded catalog/hero/brand files land in `public/` after standalone boot.
  // next/image optimizer soft-404s those until PM2 reload; use plain <img>
  // so the browser requests `/images/...` directly from Next's public tree.
  if (src.startsWith("/images/")) {
    return false;
  }
  if (src.startsWith("/")) {
    return !src.endsWith(".svg");
  }
  return src.startsWith("http://") || src.startsWith("https://");
}

/**
 * Storefront `next/image` adapter for shared UI media slots (gallery, cards).
 * Falls back to `<img>` for SVG placeholders and non-URL keys.
 */
export function StorefrontMediaImage({
  src,
  alt,
  className,
  style,
  loading,
  decoding = "async",
  fetchPriority,
  width = 800,
  height = 800,
  sizes,
  priority,
  onLoad,
  imageRef,
}: MediaImageProps) {
  const usePriority = priority === true || fetchPriority === "high";

  if (!isOptimizableSrc(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        className={className}
        style={style}
        loading={usePriority ? "eager" : loading}
        decoding={decoding}
        fetchPriority={usePriority ? "high" : fetchPriority}
        width={width}
        height={height}
        sizes={sizes}
        onLoad={onLoad}
      />
    );
  }

  return (
    <Image
      ref={imageRef}
      src={src}
      alt={alt}
      className={className}
      style={style}
      width={width}
      height={height}
      sizes={sizes ?? "(max-width: 768px) 100vw, 480px"}
      priority={usePriority}
      loading={usePriority ? undefined : loading}
      decoding={decoding}
      onLoad={onLoad}
    />
  );
}
