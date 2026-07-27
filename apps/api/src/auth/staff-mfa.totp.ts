import { generateSecret, generateURI, verify } from 'otplib';

export function createTotpSecret(): string {
  return generateSecret();
}

export function buildTotpUri(input: {
  issuer: string;
  label: string;
  secret: string;
}): string {
  return generateURI({
    issuer: input.issuer,
    label: input.label,
    secret: input.secret,
  });
}

export async function verifyTotpCode(
  secret: string,
  token: string,
): Promise<boolean> {
  const result = await verify({ secret, token });
  return result.valid === true;
}
