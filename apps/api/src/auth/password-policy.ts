/**
 * Account password policy: length + character-class diversity + trivial denylist.
 * Applied to staff create/update and customer register/reset (not login verify).
 */

export const ACCOUNT_PASSWORD_MIN_LENGTH = 12;
export const ACCOUNT_PASSWORD_MAX_LENGTH = 128;

const COMMON_PASSWORDS = new Set(
  [
    'password',
    'password123',
    'password1234',
    '123456789012',
    '1234567890123',
    'qwertyuiopas',
    'qwerty123456',
    'letmein12345',
    'welcome12345',
    'admin1234567',
    'iloveyou1234',
    'changeme1234',
    'itmarket12345',
    'azerbaijan12',
    'baku12345678',
  ].map((value) => value.toLowerCase()),
);

export type PasswordPolicyResult =
  | { ok: true }
  | { ok: false; code: 'too_short' | 'too_long' | 'too_weak' | 'common' };

export function evaluatePasswordPolicy(password: string): PasswordPolicyResult {
  if (password.length < ACCOUNT_PASSWORD_MIN_LENGTH) {
    return { ok: false, code: 'too_short' };
  }
  if (password.length > ACCOUNT_PASSWORD_MAX_LENGTH) {
    return { ok: false, code: 'too_long' };
  }

  const classes = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (classes < 3) {
    return { ok: false, code: 'too_weak' };
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { ok: false, code: 'common' };
  }

  return { ok: true };
}

export function passwordPolicyMessage(
  code: 'too_short' | 'too_long' | 'too_weak' | 'common',
): string {
  switch (code) {
    case 'too_short':
      return `Password must be at least ${ACCOUNT_PASSWORD_MIN_LENGTH} characters`;
    case 'too_long':
      return `Password must be at most ${ACCOUNT_PASSWORD_MAX_LENGTH} characters`;
    case 'too_weak':
      return 'Password must include at least three of: lowercase, uppercase, digit, symbol';
    case 'common':
      return 'Password is too common; choose a stronger one';
  }
}
