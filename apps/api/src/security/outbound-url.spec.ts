import { assertSafeSeoAiBaseUrl, isBlockedOutboundHostname } from './outbound-url';

describe('outbound-url SSRF guards', () => {
  it('allows the default Gemini OpenAI-compat host', () => {
    const url = assertSafeSeoAiBaseUrl(
      'https://generativelanguage.googleapis.com/v1beta/openai',
    );
    expect(url.hostname).toBe('generativelanguage.googleapis.com');
  });

  it('rejects http, credentials, private IPs, and non-allowlisted hosts', () => {
    expect(() =>
      assertSafeSeoAiBaseUrl('http://generativelanguage.googleapis.com/v1'),
    ).toThrow(/https/);
    expect(() =>
      assertSafeSeoAiBaseUrl(
        'https://user:pass@generativelanguage.googleapis.com/v1',
      ),
    ).toThrow(/credentials/);
    expect(() =>
      assertSafeSeoAiBaseUrl('https://169.254.169.254/latest/meta-data'),
    ).toThrow(/not allowed|allowlist/);
    expect(() =>
      assertSafeSeoAiBaseUrl('https://evil.example/v1'),
    ).toThrow(/allowlist/);
    expect(() =>
      assertSafeSeoAiBaseUrl('https://localhost/v1'),
    ).toThrow(/not allowed|allowlist/);
  });

  it('flags link-local and RFC1918 hostnames', () => {
    expect(isBlockedOutboundHostname('127.0.0.1')).toBe(true);
    expect(isBlockedOutboundHostname('10.0.0.1')).toBe(true);
    expect(isBlockedOutboundHostname('192.168.1.1')).toBe(true);
    expect(isBlockedOutboundHostname('metadata.google.internal')).toBe(true);
    expect(isBlockedOutboundHostname('generativelanguage.googleapis.com')).toBe(
      false,
    );
  });
});
