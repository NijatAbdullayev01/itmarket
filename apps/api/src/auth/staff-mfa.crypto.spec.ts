import {
  decryptMfaSecret,
  encryptMfaSecret,
  findMatchingRecoveryCodeHash,
  generateRecoveryCodes,
  hashRecoveryCode,
  hashRecoveryCodes,
} from './staff-mfa.crypto';

describe('staff MFA crypto helpers', () => {
  const appSecret = 'unit-test-app-secret-with-at-least-32-chars';

  it('round-trips AES-256-GCM encrypted MFA secrets', () => {
    const secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
    const encrypted = encryptMfaSecret(secret, appSecret);
    expect(encrypted).not.toContain(secret);
    expect(encrypted.split('.')).toHaveLength(3);
    expect(decryptMfaSecret(encrypted, appSecret)).toBe(secret);
  });

  it('produces distinct ciphertexts for the same plaintext', () => {
    const secret = 'ABCDEFGHIJKLMNOPQRSTUVWX';
    const first = encryptMfaSecret(secret, appSecret);
    const second = encryptMfaSecret(secret, appSecret);
    expect(first).not.toBe(second);
    expect(decryptMfaSecret(first, appSecret)).toBe(secret);
    expect(decryptMfaSecret(second, appSecret)).toBe(secret);
  });

  it('rejects decryption with the wrong APP_SECRET', () => {
    const encrypted = encryptMfaSecret('SECRETVALUE123456', appSecret);
    expect(() =>
      decryptMfaSecret(encrypted, 'different-app-secret-at-least-32-chars!!'),
    ).toThrow();
  });

  it('rejects malformed encrypted payloads', () => {
    expect(() => decryptMfaSecret('not-a-valid-payload', appSecret)).toThrow(
      'Invalid MFA secret payload',
    );
  });

  it('hashes recovery codes and matches normalized input', () => {
    const code = 'a1b2c3d4e5';
    const hash = hashRecoveryCode(code, appSecret);
    expect(hash).toHaveLength(64);
    expect(
      findMatchingRecoveryCodeHash('A1B2-C3D4-E5', [hash], appSecret),
    ).toBe(hash);
    expect(
      findMatchingRecoveryCodeHash('ffffffffffffffffff', [hash], appSecret),
    ).toBeNull();
  });

  it('generates unique recovery codes and hashed sets', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    const hashes = hashRecoveryCodes(codes, appSecret);
    expect(hashes).toHaveLength(10);
    expect(new Set(hashes).size).toBe(10);
    expect(
      findMatchingRecoveryCodeHash(codes[3]!, hashes, appSecret),
    ).not.toBeNull();
  });
});
