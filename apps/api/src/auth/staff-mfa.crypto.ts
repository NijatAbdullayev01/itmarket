import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const AES_ALGORITHM = 'aes-256-gcm';
const RECOVERY_CODE_BYTES = 5;
const RECOVERY_CODE_COUNT = 10;

export function deriveMfaEncryptionKey(appSecret: string): Buffer {
  return createHash('sha256').update(appSecret, 'utf8').digest();
}

/** AES-256-GCM payload: `iv.tag.ciphertext` (each base64url). */
export function encryptMfaSecret(plaintext: string, appSecret: string): string {
  const key = deriveMfaEncryptionKey(appSecret);
  const iv = randomBytes(12);
  const cipher = createCipheriv(AES_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

export function decryptMfaSecret(payload: string, appSecret: string): string {
  const [ivPart, tagPart, dataPart] = payload.split('.');
  if (
    ivPart === undefined ||
    tagPart === undefined ||
    dataPart === undefined ||
    ivPart.length === 0 ||
    tagPart.length === 0 ||
    dataPart.length === 0
  ) {
    throw new Error('Invalid MFA secret payload');
  }
  const key = deriveMfaEncryptionKey(appSecret);
  const iv = Buffer.from(ivPart, 'base64url');
  const tag = Buffer.from(tagPart, 'base64url');
  const data = Buffer.from(dataPart, 'base64url');
  const decipher = createDecipheriv(AES_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    'utf8',
  );
}

export function hashRecoveryCode(code: string, appSecret: string): string {
  return createHmac('sha256', appSecret)
    .update(normalizeRecoveryCode(code), 'utf8')
    .digest('hex');
}

export function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let index = 0; index < RECOVERY_CODE_COUNT; index += 1) {
    codes.push(randomBytes(RECOVERY_CODE_BYTES).toString('hex'));
  }
  return codes;
}

export function hashRecoveryCodes(
  codes: readonly string[],
  appSecret: string,
): string[] {
  return codes.map((code) => hashRecoveryCode(code, appSecret));
}

export function findMatchingRecoveryCodeHash(
  code: string,
  hashes: readonly string[],
  appSecret: string,
): string | null {
  const candidate = Buffer.from(hashRecoveryCode(code, appSecret), 'hex');
  for (const hash of hashes) {
    const expected = Buffer.from(hash, 'hex');
    if (
      expected.length === candidate.length &&
      timingSafeEqual(expected, candidate)
    ) {
      return hash;
    }
  }
  return null;
}

function normalizeRecoveryCode(code: string): string {
  return code.trim().toLowerCase().replace(/[\s-]/g, '');
}
