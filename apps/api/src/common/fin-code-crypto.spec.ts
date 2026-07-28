import {
  encryptFinCode,
  isEncryptedFinCode,
  revealFinCode,
} from './fin-code-crypto';

const SECRET = 'unit-test-app-secret-at-least-32-chars';

describe('fin-code-crypto', () => {
  it('round-trips a FIN and uses a versioned ciphertext prefix', () => {
    const cipher = encryptFinCode('ab12345', SECRET);
    expect(isEncryptedFinCode(cipher)).toBe(true);
    expect(cipher).not.toContain('AB12345');
    expect(revealFinCode(cipher, SECRET)).toBe('AB12345');
  });

  it('passes through legacy plaintext rows', () => {
    expect(revealFinCode('xy98765', SECRET)).toBe('XY98765');
  });

  it('is idempotent when encrypting already-encrypted values', () => {
    const first = encryptFinCode('AB12345', SECRET);
    expect(encryptFinCode(first, SECRET)).toBe(first);
  });

  it('fails closed on corrupt ciphertext', () => {
    expect(revealFinCode('enc:v1:not.valid.cipher', SECRET)).toBeNull();
  });
});
