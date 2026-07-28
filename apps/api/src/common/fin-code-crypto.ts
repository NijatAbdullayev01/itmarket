import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

const AES_ALGORITHM = 'aes-256-gcm';
/** Versioned ciphertext prefix so legacy plaintext FIN rows remain readable. */
export const FIN_CODE_CIPHER_PREFIX = 'enc:v1:';

function deriveFinEncryptionKey(appSecret: string): Buffer {
  return createHash('sha256')
    .update(`itmarket:fin-code:${appSecret}`, 'utf8')
    .digest();
}

/**
 * Encrypts a normalized FIN for at-rest storage (AES-256-GCM).
 * Input must already be uppercase alphanumeric (7 chars for AZ FIN).
 */
export function encryptFinCode(plaintext: string, appSecret: string): string {
  const trimmed = plaintext.trim();
  if (trimmed.length === 0) {
    throw new Error('FIN code is empty');
  }
  if (isEncryptedFinCode(trimmed)) {
    return trimmed;
  }
  const normalized = trimmed.toUpperCase();
  const key = deriveFinEncryptionKey(appSecret);
  const iv = randomBytes(12);
  const cipher = createCipheriv(AES_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(normalized, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return (
    FIN_CODE_CIPHER_PREFIX +
    [
      iv.toString('base64url'),
      tag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.')
  );
}

export function isEncryptedFinCode(value: string): boolean {
  return value.startsWith(FIN_CODE_CIPHER_PREFIX);
}

/**
 * Reveals FIN for authorized display. Legacy plaintext rows pass through;
 * corrupt ciphertext returns null (fail closed for UI).
 */
export function revealFinCode(
  stored: string | null | undefined,
  appSecret: string,
): string | null {
  if (stored === null || stored === undefined || stored.trim() === '') {
    return null;
  }
  if (!isEncryptedFinCode(stored)) {
    return stored.trim().toUpperCase();
  }
  try {
    return decryptFinCode(stored, appSecret);
  } catch {
    return null;
  }
}

function decryptFinCode(payload: string, appSecret: string): string {
  const body = payload.slice(FIN_CODE_CIPHER_PREFIX.length);
  const [ivPart, tagPart, dataPart] = body.split('.');
  if (
    ivPart === undefined ||
    tagPart === undefined ||
    dataPart === undefined ||
    ivPart.length === 0 ||
    tagPart.length === 0 ||
    dataPart.length === 0
  ) {
    throw new Error('Invalid FIN ciphertext');
  }
  const key = deriveFinEncryptionKey(appSecret);
  const iv = Buffer.from(ivPart, 'base64url');
  const tag = Buffer.from(tagPart, 'base64url');
  const data = Buffer.from(dataPart, 'base64url');
  const decipher = createDecipheriv(AES_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()])
    .toString('utf8')
    .toUpperCase();
}
