/**
 * Measures non-background content inside catalog product photos so the
 * gallery can crop padded white/empty margins instead of letterboxing them.
 */

export type GalleryContentFrame = {
  /** CSS object-view-box inset() percentages */
  viewBox: string;
  /** Fallback zoom when object-view-box is unavailable */
  zoom: number;
  /** Suggested stage aspect ratio (width / height), clamped for layout */
  aspectRatio: number;
};

const SAMPLE = 160;
const BG_DISTANCE = 28;
const BREATH = 0.05;
const MIN_FILL = 0.08;
const MAX_FILL = 0.9;
const MIN_ZOOM = 1;
const MAX_ZOOM = 1.4;
const MIN_ASPECT = 0.55; // portrait product subjects
const MAX_ASPECT = 1.25;

function colorDistance(
  a: [number, number, number],
  b: [number, number, number],
): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function samplePatch(
  data: Uint8ClampedArray,
  width: number,
  channels: number,
  cx: number,
  cy: number,
): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = cy - 1; y <= cy + 1; y += 1) {
    for (let x = cx - 1; x <= cx + 1; x += 1) {
      if (x < 0 || y < 0 || x >= width || y >= SAMPLE) continue;
      const i = (y * width + x) * channels;
      r += data[i] ?? 0;
      g += data[i + 1] ?? 0;
      b += data[i + 2] ?? 0;
      n += 1;
    }
  }
  return n === 0 ? [255, 255, 255] : [r / n, g / n, b / n];
}

type MeasurableImage = CanvasImageSource & {
  width?: number;
  height?: number;
  naturalWidth?: number;
  naturalHeight?: number;
  videoWidth?: number;
  videoHeight?: number;
};

export function measureGalleryContentFrame(
  source: MeasurableImage,
): GalleryContentFrame | null {
  const naturalW =
    source.naturalWidth || source.videoWidth || source.width || 0;
  const naturalH =
    source.naturalHeight || source.videoHeight || source.height || 0;
  if (naturalW < 8 || naturalH < 8) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE;
  canvas.height = SAMPLE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return null;
  }

  try {
    ctx.drawImage(source, 0, 0, SAMPLE, SAMPLE);
  } catch {
    return null;
  }

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, SAMPLE, SAMPLE).data;
  } catch {
    return null;
  }

  const channels = data.length / (SAMPLE * SAMPLE);
  const corners: Array<[number, number, number]> = [
    samplePatch(data, SAMPLE, channels, 1, 1),
    samplePatch(data, SAMPLE, channels, SAMPLE - 2, 1),
    samplePatch(data, SAMPLE, channels, 1, SAMPLE - 2),
    samplePatch(data, SAMPLE, channels, SAMPLE - 2, SAMPLE - 2),
  ];
  const bg: [number, number, number] = [
    corners.reduce((s, c) => s + c[0], 0) / corners.length,
    corners.reduce((s, c) => s + c[1], 0) / corners.length,
    corners.reduce((s, c) => s + c[2], 0) / corners.length,
  ];

  const isBackground = (x: number, y: number) => {
    const i = (y * SAMPLE + x) * channels;
    const pixel: [number, number, number] = [
      data[i] ?? 0,
      data[i + 1] ?? 0,
      data[i + 2] ?? 0,
    ];
    return colorDistance(pixel, bg) <= BG_DISTANCE;
  };

  let top = 0;
  let bottom = SAMPLE - 1;
  let left = 0;
  let right = SAMPLE - 1;

  outerTop: for (; top < SAMPLE; top += 1) {
    for (let x = 0; x < SAMPLE; x += 1) {
      if (!isBackground(x, top)) break outerTop;
    }
  }
  outerBottom: for (; bottom >= 0; bottom -= 1) {
    for (let x = 0; x < SAMPLE; x += 1) {
      if (!isBackground(x, bottom)) break outerBottom;
    }
  }
  outerLeft: for (; left < SAMPLE; left += 1) {
    for (let y = 0; y < SAMPLE; y += 1) {
      if (!isBackground(left, y)) break outerLeft;
    }
  }
  outerRight: for (; right >= 0; right -= 1) {
    for (let y = 0; y < SAMPLE; y += 1) {
      if (!isBackground(right, y)) break outerRight;
    }
  }

  if (top >= bottom || left >= right) {
    return null;
  }

  const contentW = right - left + 1;
  const contentH = bottom - top + 1;
  const fill = (contentW * contentH) / (SAMPLE * SAMPLE);
  if (fill < MIN_FILL || fill > MAX_FILL) {
    return null;
  }

  const topInset = Math.max(0, top / SAMPLE - BREATH);
  const leftInset = Math.max(0, left / SAMPLE - BREATH);
  const bottomInset = Math.max(0, (SAMPLE - 1 - bottom) / SAMPLE - BREATH);
  const rightInset = Math.max(0, (SAMPLE - 1 - right) / SAMPLE - BREATH);

  // Keep a usable crop; if breath ate the crop, skip framing.
  if (topInset + bottomInset >= 0.85 || leftInset + rightInset >= 0.85) {
    return null;
  }

  const framedW = 1 - leftInset - rightInset;
  const framedH = 1 - topInset - bottomInset;
  if (framedW <= 0.05 || framedH <= 0.05) {
    return null;
  }

  const contentAspect = framedW / framedH;
  const aspectRatio = Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, contentAspect));

  // Zoom fallback for browsers without object-view-box: enlarge until the
  // framed subject roughly fills the portrait stage.
  const zoom = Math.min(
    MAX_ZOOM,
    Math.max(MIN_ZOOM, Number((1 / Math.max(framedW, framedH)).toFixed(3))),
  );

  const pct = (value: number) => `${(value * 100).toFixed(2)}%`;

  return {
    viewBox: `inset(${pct(topInset)} ${pct(rightInset)} ${pct(bottomInset)} ${pct(leftInset)})`,
    zoom: Number(zoom.toFixed(3)),
    aspectRatio: Number(aspectRatio.toFixed(4)),
  };
}

export function supportsObjectViewBox(): boolean {
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") {
    return false;
  }
  return CSS.supports("object-view-box", "inset(10%)");
}
