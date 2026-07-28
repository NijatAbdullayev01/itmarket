import {
  evaluatePasswordPolicy,
  passwordPolicyMessage,
} from './password-policy';

describe('password policy', () => {
  it('accepts a diverse 12+ character password', () => {
    expect(evaluatePasswordPolicy('CorrectHorse1!')).toEqual({ ok: true });
  });

  it('rejects short or single-class passwords', () => {
    expect(evaluatePasswordPolicy('short1!A')).toMatchObject({
      ok: false,
      code: 'too_short',
    });
    expect(evaluatePasswordPolicy('alllowercase1')).toMatchObject({
      ok: false,
      code: 'too_weak',
    });
    expect(evaluatePasswordPolicy('Password1234')).toMatchObject({
      ok: false,
      code: 'common',
    });
  });

  it('maps codes to actionable messages', () => {
    expect(passwordPolicyMessage('too_weak')).toMatch(/three/i);
  });
});
