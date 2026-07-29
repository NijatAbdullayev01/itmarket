import type {
  CSSProperties,
  ReactNode,
  Ref,
  SyntheticEvent,
} from "react";

export type MediaImageProps = {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  loading?: "eager" | "lazy";
  decoding?: "async" | "auto" | "sync";
  fetchPriority?: "high" | "low" | "auto";
  width?: number;
  height?: number;
  sizes?: string;
  /** When true, prefer LCP-oriented loading (maps to fetchPriority=high). */
  priority?: boolean;
  onLoad?: (event: SyntheticEvent<HTMLImageElement>) => void;
  imageRef?: Ref<HTMLImageElement>;
};

export type MediaImageComponent = (props: MediaImageProps) => ReactNode;

/** Default browser `<img>` — apps may inject `next/image` via props. */
export function DefaultMediaImage({
  src,
  alt,
  className,
  style,
  loading,
  decoding = "async",
  fetchPriority,
  width,
  height,
  sizes,
  priority,
  onLoad,
  imageRef,
}: MediaImageProps) {
  const resolvedPriority = priority ? "high" : fetchPriority;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imageRef}
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading={priority ? "eager" : loading}
      decoding={decoding}
      fetchPriority={resolvedPriority}
      width={width}
      height={height}
      sizes={sizes}
      onLoad={onLoad}
    />
  );
}
