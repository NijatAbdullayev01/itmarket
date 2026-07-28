const JPEG_SOI = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const WEBP_RIFF = Buffer.from("RIFF");
const WEBP_WEBP = Buffer.from("WEBP");

export type CatalogImageMimeType = "image/jpeg" | "image/png" | "image/webp";

function looksLikeJpeg(body: Buffer): boolean {
  if (body.byteLength < 4 || body[3] === 0x00 || body[3] === 0xff) {
    return false;
  }
  return body.includes(Buffer.from([0xff, 0xd9]));
}

function looksLikePng(body: Buffer): boolean {
  if (body.byteLength < 24) {
    return false;
  }
  return body.subarray(12, 16).toString("ascii") === "IHDR";
}

function looksLikeWebp(body: Buffer): boolean {
  if (body.byteLength < 16) {
    return false;
  }
  const riffSize = body.readUInt32LE(4);
  if (riffSize + 8 > body.byteLength + 1_048_576) {
    return false;
  }
  const fourCC = body.subarray(12, 16).toString("ascii");
  return fourCC === "VP8 " || fourCC === "VP8L" || fourCC === "VP8X";
}

function hasDangerousTextPrefix(body: Buffer): boolean {
  const head = body
    .subarray(0, Math.min(body.byteLength, 256))
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .trimStart()
    .toLowerCase();
  return (
    head.startsWith("<!doctype") ||
    head.startsWith("<html") ||
    head.startsWith("<svg") ||
    head.startsWith("<?xml") ||
    head.startsWith("<script") ||
    head.startsWith("<?php")
  );
}

/**
 * Reject PE/ELF appended after a structurally complete image (aligned with API D-013).
 */
export function hasTrailingExecutablePolyglot(
  body: Buffer,
  mimeType: CatalogImageMimeType,
): boolean {
  const trailing = trailingBytesAfterImage(body, mimeType);
  if (trailing === null || trailing.byteLength === 0) {
    return false;
  }
  return (
    trailing.includes(Buffer.from([0x4d, 0x5a])) ||
    trailing.includes(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))
  );
}

function trailingBytesAfterImage(
  body: Buffer,
  mimeType: CatalogImageMimeType,
): Buffer | null {
  if (mimeType === "image/jpeg") {
    const eoi = body.lastIndexOf(Buffer.from([0xff, 0xd9]));
    if (eoi < 0) {
      return null;
    }
    return body.subarray(eoi + 2);
  }

  if (mimeType === "image/png") {
    const iend = body.indexOf(Buffer.from("IEND"));
    if (iend < 0) {
      return null;
    }
    const end = iend + 4 + 4;
    if (end >= body.byteLength) {
      return Buffer.alloc(0);
    }
    return body.subarray(end);
  }

  const riffSize = body.readUInt32LE(4);
  const declaredEnd = riffSize + 8;
  if (declaredEnd >= body.byteLength) {
    return Buffer.alloc(0);
  }
  return body.subarray(declaredEnd);
}

function sniffCatalogImageMime(body: Buffer): CatalogImageMimeType | null {
  if (body.byteLength < 12) {
    return null;
  }
  if (body.subarray(0, 3).equals(JPEG_SOI) && looksLikeJpeg(body)) {
    return "image/jpeg";
  }
  if (body.subarray(0, 8).equals(PNG_SIGNATURE) && looksLikePng(body)) {
    return "image/png";
  }
  if (
    body.subarray(0, 4).equals(WEBP_RIFF) &&
    body.subarray(8, 12).equals(WEBP_WEBP) &&
    looksLikeWebp(body)
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * Trust bytes, not client Content-Type (aligned with API media sniff).
 */
export function resolveCatalogImageMime(input: {
  body: Buffer;
  declaredMimeType?: string;
}): CatalogImageMimeType {
  if (hasDangerousTextPrefix(input.body)) {
    throw new Error("Media content looks like markup or script");
  }
  const sniffed = sniffCatalogImageMime(input.body);
  if (sniffed === null) {
    throw new Error("Unsupported or corrupt media content");
  }
  if (hasTrailingExecutablePolyglot(input.body, sniffed)) {
    throw new Error("Media content looks like an embedded executable");
  }
  if (
    input.declaredMimeType !== undefined &&
    input.declaredMimeType.trim().length > 0
  ) {
    const declared = input.declaredMimeType.trim().toLowerCase();
    if (
      declared !== "image/jpeg" &&
      declared !== "image/png" &&
      declared !== "image/webp"
    ) {
      throw new Error("Unsupported media MIME type");
    }
    if (declared !== sniffed) {
      throw new Error("Declared MIME does not match file content");
    }
  }
  return sniffed;
}

export function extensionForCatalogImageMime(mimeType: CatalogImageMimeType): string {
  if (mimeType === "image/png") {
    return "png";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  return "jpg";
}
