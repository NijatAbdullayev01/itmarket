/** Retail 1D / QR formats used on POS product labels. */
const NATIVE_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "codabar",
  "itf",
  "qr_code",
] as const;

type NativeBarcodeDetector = {
  detect: (
    source: CanvasImageSource,
  ) => Promise<ReadonlyArray<{ rawValue: string }>>;
};

type NativeBarcodeDetectorCtor = new (options?: {
  formats?: readonly string[];
}) => NativeBarcodeDetector;

export type PosBarcodeScanSession = {
  stop: () => void;
};

function getNativeBarcodeDetectorCtor(): NativeBarcodeDetectorCtor | null {
  const ctor = (
    globalThis as {
      BarcodeDetector?: NativeBarcodeDetectorCtor & {
        getSupportedFormats?: () => Promise<string[]>;
      };
    }
  ).BarcodeDetector;
  return typeof ctor === "function" ? ctor : null;
}

function normalizeScannedValue(raw: string): string | null {
  const value = raw.trim();
  return value.length >= 4 ? value : null;
}

function stopMediaStream(stream: MediaStream | null) {
  if (stream === null) {
    return;
  }
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

/**
 * Opens the rear camera (when available) and resolves the first readable barcode.
 * Prefers the native BarcodeDetector API; falls back to ZXing for Safari/iOS.
 */
export async function startPosBarcodeCameraScan(
  video: HTMLVideoElement,
  onDetected: (barcode: string) => void,
): Promise<PosBarcodeScanSession> {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.mediaDevices?.getUserMedia !== "function"
  ) {
    throw new Error("Bu cihazda kamera skanı dəstəklənmir");
  }

  let stopped = false;
  let rafId = 0;
  let stream: MediaStream | null = null;
  let zxingStop: (() => void) | null = null;
  let settled = false;

  const stop = () => {
    if (stopped) {
      return;
    }
    stopped = true;
    window.cancelAnimationFrame(rafId);
    zxingStop?.();
    zxingStop = null;
    stopMediaStream(stream);
    stream = null;
    video.srcObject = null;
  };

  const emit = (raw: string) => {
    if (stopped || settled) {
      return;
    }
    const value = normalizeScannedValue(raw);
    if (value === null) {
      return;
    }
    settled = true;
    onDetected(value);
    stop();
  };

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  } catch {
    throw new Error(
      "Kamera açıla bilmədi. Brauzerdə kamera icazəsini yoxlayın.",
    );
  }

  const NativeDetector = getNativeBarcodeDetectorCtor();
  if (NativeDetector !== null) {
    video.srcObject = stream;
    video.setAttribute("playsinline", "true");
    video.muted = true;
    await video.play();

    let formats = [...NATIVE_FORMATS];
    try {
      const supported = await (
        NativeDetector as NativeBarcodeDetectorCtor & {
          getSupportedFormats?: () => Promise<string[]>;
        }
      ).getSupportedFormats?.();
      if (supported !== undefined && supported.length > 0) {
        const allowed = new Set(supported);
        formats = NATIVE_FORMATS.filter((format) => allowed.has(format));
        if (formats.length === 0) {
          formats = [...NATIVE_FORMATS];
        }
      }
    } catch {
      // Keep default formats when capability probe fails.
    }

    const detector = new NativeDetector({ formats });
    let detecting = false;

    const tick = () => {
      if (stopped) {
        return;
      }
      rafId = window.requestAnimationFrame(() => {
        void (async () => {
          if (stopped) {
            return;
          }
          if (!detecting && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            detecting = true;
            try {
              const codes = await detector.detect(video);
              const first = codes[0]?.rawValue;
              if (first !== undefined) {
                emit(first);
                return;
              }
            } catch {
              // Transient frame decode errors are expected.
            } finally {
              detecting = false;
            }
          }
          tick();
        })();
      });
    };

    tick();
    return { stop };
  }

  const { BrowserMultiFormatReader, BarcodeFormat } = await import(
    "@zxing/browser"
  );
  const reader = new BrowserMultiFormatReader();
  reader.possibleFormats = [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.ITF,
    BarcodeFormat.CODABAR,
    BarcodeFormat.QR_CODE,
  ];

  const controls = await reader.decodeFromStream(stream, video, (result) => {
    if (result) {
      emit(result.getText());
    }
  });
  zxingStop = () => {
    controls.stop();
  };

  return { stop };
}
