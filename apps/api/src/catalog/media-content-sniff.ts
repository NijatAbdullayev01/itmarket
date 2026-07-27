import {
  isProductMediaMimeType,
  type ProductMediaMimeType,
} from './media-storage.port';

const JPEG_SOI = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const WEBP_RIFF = Buffer.from('RIFF');
const WEBP_WEBP = Buffer.from('WEBP');

/**
 * D-013: trust bytes, not the client Content-Type / filename.
 * Returns null when the payload is not an allowed product image.
 */
export function sniffProductMediaMime(
  body: Buffer,
): ProductMediaMimeType | null {
  if (body.byteLength < 12) {
    return null;
  }

  if (body.subarray(0, 3).equals(JPEG_SOI) && looksLikeJpeg(body)) {
    return 'image/jpeg';
  }

  if (body.subarray(0, 8).equals(PNG_SIGNATURE) && looksLikePng(body)) {
    return 'image/png';
  }

  if (
    body.subarray(0, 4).equals(WEBP_RIFF) &&
    body.subarray(8, 12).equals(WEBP_WEBP) &&
    looksLikeWebp(body)
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Rejects SVG/HTML/script polyglot prefixes and MIME spoofing.
 * Declared MIME (when provided) must match sniffed content.
 */
export function resolveProductMediaMime(input: {
  body: Buffer;
  declaredMimeType?: string;
}): ProductMediaMimeType {
  if (hasDangerousTextPrefix(input.body)) {
    throw new Error('Media content looks like markup or script');
  }

  const sniffed = sniffProductMediaMime(input.body);
  if (sniffed === null) {
    throw new Error('Unsupported or corrupt media content');
  }

  if (
    input.declaredMimeType !== undefined &&
    input.declaredMimeType.trim().length > 0
  ) {
    const declared = input.declaredMimeType.trim().toLowerCase();
    if (!isProductMediaMimeType(declared)) {
      throw new Error('Unsupported media MIME type');
    }
    if (declared !== sniffed) {
      throw new Error('Declared MIME does not match file content');
    }
  }

  return sniffed;
}

function looksLikeJpeg(body: Buffer): boolean {
  // Second marker after SOI must be a valid JPEG marker (FF xx, xx != 00/FF).
  if (body.byteLength < 4 || body[3] === 0x00 || body[3] === 0xff) {
    return false;
  }
  // Require EOI somewhere in the payload (cheap integrity check).
  return body.includes(Buffer.from([0xff, 0xd9]));
}

function looksLikePng(body: Buffer): boolean {
  // IHDR chunk: length(4) + "IHDR" at offset 8.
  if (body.byteLength < 24) {
    return false;
  }
  return body.subarray(12, 16).toString('ascii') === 'IHDR';
}

function looksLikeWebp(body: Buffer): boolean {
  if (body.byteLength < 16) {
    return false;
  }
  const riffSize = body.readUInt32LE(4);
  // RIFF size counts bytes after the size field; total file ≈ size + 8.
  if (riffSize + 8 > body.byteLength + 1_048_576) {
    return false;
  }
  const fourCC = body.subarray(12, 16).toString('ascii');
  return fourCC === 'VP8 ' || fourCC === 'VP8L' || fourCC === 'VP8X';
}

function hasDangerousTextPrefix(body: Buffer): boolean {
  const head = body
    .subarray(0, Math.min(body.byteLength, 256))
    .toString('utf8')
    .replace(/^\uFEFF/, '')
    .trimStart()
    .toLowerCase();
  return (
    head.startsWith('<!doctype') ||
    head.startsWith('<html') ||
    head.startsWith('<svg') ||
    head.startsWith('<?xml') ||
    head.startsWith('<script') ||
    head.startsWith('<?php')
  );
}
